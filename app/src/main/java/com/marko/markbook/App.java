package com.marko.markbook;

import android.app.Application;
import android.content.Context;
import android.util.Log;

import org.json.JSONObject;
import org.mozilla.geckoview.AllowOrDeny;
import org.mozilla.geckoview.GeckoResult;
import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoRuntimeSettings;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoSessionSettings;
import org.mozilla.geckoview.WebExtension;
import org.mozilla.geckoview.WebExtensionController;

import java.util.HashSet;
import java.util.Set;

/** One Gecko engine and one Facebook tab for the whole process. */
public class App extends Application {
    static final String TAG = "MarkBook";
    static final String HOME = "https://m.facebook.com/";
    static final String MESSAGES = "https://www.facebook.com/messages/";

    /** {addon id, addons.mozilla.org slug}: installed (AMO-signed) on first start, updated later. */
    private static final String[][] EXTENSIONS = {
            {"uBlock0@raymondhill.net", "ublock-origin"},
    };

    private static GeckoRuntime runtime;
    private static GeckoSession session;
    private static GeckoSession messages;
    private static java.util.function.Consumer<JSONObject> pageListener;
    private static WebExtension helper;
    private static final java.util.Map<GeckoSession, WebExtension.Port> ports = new java.util.HashMap<>();

    static GeckoRuntime runtime(Context ctx) {
        if (runtime == null) {
            GeckoRuntimeSettings settings = new GeckoRuntimeSettings.Builder()
                    .consoleOutput(false)
                    .loginAutofillEnabled(false)
                    .build();
            runtime = GeckoRuntime.create(ctx.getApplicationContext(), settings);
            setupExtensions(runtime);
        }
        return runtime;
    }

    static boolean hasSession() {
        return session != null && session.isOpen();
    }

    static GeckoSession session(Context ctx) {
        if (!hasSession()) {
            GeckoSessionSettings settings = new GeckoSessionSettings.Builder()
                    .usePrivateMode(false)
                    .userAgentMode(GeckoSessionSettings.USER_AGENT_MODE_MOBILE)
                    .viewportMode(GeckoSessionSettings.VIEWPORT_MODE_MOBILE)
                    .build();
            session = new GeckoSession(settings);
            session.open(runtime(ctx));
            attachHelper(session);
            session.loadUri(HOME);
        }
        return session;
    }

    static boolean hasMessages() {
        return messages != null && messages.isOpen();
    }

    /**
     * The messages tab. Facebook's mobile site only offers "Get the Messenger app", so this tab
     * asks for the desktop site (which has the inbox) but keeps the phone-sized viewport.
     */
    static GeckoSession messages(Context ctx) {
        if (!hasMessages()) {
            GeckoSessionSettings settings = new GeckoSessionSettings.Builder()
                    .usePrivateMode(false)
                    .userAgentMode(GeckoSessionSettings.USER_AGENT_MODE_DESKTOP)
                    .viewportMode(GeckoSessionSettings.VIEWPORT_MODE_MOBILE)
                    .build();
            messages = new GeckoSession(settings);
            messages.open(runtime(ctx));
            attachHelper(messages);
            messages.loadUri(MESSAGES);
        }
        return messages;
    }

    /** m.facebook.com/messages/... -> www.facebook.com/messages/... */
    static String toDesktop(String url) {
        android.net.Uri u = android.net.Uri.parse(url);
        return u.buildUpon().scheme("https").authority("www.facebook.com").build().toString();
    }

    static void setPageListener(java.util.function.Consumer<JSONObject> l) {
        pageListener = l;
    }

    static void resetSession() {
        for (GeckoSession s : new GeckoSession[]{session, messages}) {
            if (s != null) {
                try { s.close(); } catch (Exception ignored) { }
            }
        }
        session = null;
        messages = null;
        ports.clear();
    }

    private static void setupExtensions(GeckoRuntime rt) {
        WebExtensionController controller = rt.getWebExtensionController();
        controller.setPromptDelegate(new WebExtensionController.PromptDelegate() {
            @Override
            public GeckoResult<WebExtension.PermissionPromptResponse> onInstallPromptRequest(
                    WebExtension ext, String[] perms, String[] origins, String[] data) {
                // Only our own fixed list of extensions is ever installed.
                return GeckoResult.fromValue(new WebExtension.PermissionPromptResponse(true, false, false));
            }

            @Override
            public GeckoResult<AllowOrDeny> onUpdatePrompt(
                    WebExtension ext, String[] perms, String[] origins, String[] data) {
                return GeckoResult.allow();
            }

            @Override
            public GeckoResult<AllowOrDeny> onOptionalPrompt(
                    WebExtension ext, String[] perms, String[] origins, String[] data) {
                return GeckoResult.allow();
            }
        });

        controller.ensureBuiltIn("resource://android/assets/extensions/helper/", "helper@markbook.marko")
                .accept(ext -> {
                    helper = ext;
                    attachHelper(session);
                    attachHelper(messages);
                }, t -> Log.e(TAG, "helper extension failed", t));

        controller.list().accept(installed -> {
            Set<String> ids = new HashSet<>();
            if (installed != null) {
                for (WebExtension ext : installed) {
                    ids.add(ext.id);
                    Log.i(TAG, "extension installed: " + ext.id + " enabled=" + ext.metaData.enabled);
                    controller.update(ext).accept(null, e -> Log.w(TAG, "update failed " + ext.id, e));
                }
            }
            for (String[] e : EXTENSIONS) {
                if (ids.contains(e[0])) continue;
                String url = "https://addons.mozilla.org/firefox/downloads/latest/" + e[1] + "/latest.xpi";
                controller.install(url).accept(x -> {
                    Log.i(TAG, "extension newly installed: " + e[0]);
                    if (hasSession()) session.reload(); // reload once the blocker is active
                }, t -> Log.e(TAG, "install failed " + e[1], t));
            }
        }, t -> Log.e(TAG, "listing extensions failed", t));
    }

    private static void attachHelper(GeckoSession target) {
        if (helper == null || target == null || !target.isOpen()) return;
        target.getWebExtensionController().setMessageDelegate(helper, new WebExtension.MessageDelegate() {
            @Override
            public void onConnect(WebExtension.Port port) {
                ports.put(target, port);
                port.setDelegate(new WebExtension.PortDelegate() {
                    @Override
                    public void onPortMessage(Object message, WebExtension.Port p) {
                        if (!(message instanceof JSONObject)) return;
                        JSONObject msg = (JSONObject) message;
                        if ("log".equals(msg.optString("type"))) {
                            Log.i(TAG, "page: " + msg.optString("text"));
                        } else if (pageListener != null) {
                            pageListener.accept(msg);
                        }
                    }

                    @Override
                    public void onDisconnect(WebExtension.Port p) {
                        if (ports.get(target) == p) ports.remove(target);
                    }
                });
            }
        }, "markbook");
    }

    /** Sends a JSON command to the page helper in the given tab. */
    static void send(GeckoSession target, String json) {
        WebExtension.Port port = ports.get(target);
        if (port == null) { Log.i(TAG, "debug: no helper port"); return; }
        try {
            port.postMessage(new JSONObject(json));
        } catch (Exception e) {
            Log.i(TAG, "debug failed: " + e);
        }
    }
}
