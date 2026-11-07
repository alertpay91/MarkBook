# MarkBook

**MarkBook** is a lightweight Android app for Facebook and Messenger without ads, without
"suggested" junk and without anything running in the background. It's a small browser built on
Mozilla's [GeckoView](https://mozilla.github.io/geckoview/) (the Firefox engine) that opens the
Facebook website. It contains no Facebook code and no modified Facebook app.

Created by **Marko Stevanović** ([@alertpay91](https://github.com/alertpay91)).
Sister app of [MarkTube](https://github.com/alertpay91/MarkTube).

<p>
  <a href="https://apps.obtainium.imranr.dev/redirect?r=obtainium%3A%2F%2Fapp%2F%257B%2522id%2522%253A%2522com.marko.markbook%2522%252C%2522url%2522%253A%2522https%253A%252F%252Fgithub.com%252Falertpay91%252FMarkBook%2522%252C%2522author%2522%253A%2522alertpay91%2522%252C%2522name%2522%253A%2522MarkBook%2522%257D"><img src="docs/badge_obtainium.png" alt="Get it on Obtainium" height="48"></a>
  &nbsp;
  <a href="https://github.com/alertpay91/MarkBook/releases/latest/download/MarkBook.apk"><b>⬇ Download MarkBook.apk</b></a>
</p>

- [🇷🇸 Uputstvo (srpski)](#-uputstvo)
- [🇬🇧 English](#-english)

## 🇷🇸 Uputstvo

MarkBook je mala Android aplikacija za Facebook i poruke.

**Šta skida:**
- reklame i sponzorisane objave;
- predloge: *People You May Know*, *Suggested for you*, *Reels* i objave stranica koje ne pratiš;
- stalno „Open app / Get Messenger“ nagovaranje.

**Šta ne radi ništa u pozadini:**
- Nema obaveštenja.
- Ne troši bateriju kad je ne koristiš.
- Ne traži lokaciju, kameru ni mikrofon.

**Preuzimanje:** okruglo dugme ⬇ na desnoj strani čuva sliku ili video koji je na sredini
ekrana u galeriju (*Pictures/MarkBook* i *Movies/MarkBook*). Video iz feed-a prvo pokreni.
Facebook-ov mobilni sajt daje video u 360p.

### Instalacija preko Obtainium-a (preporučeno, ažurira se sam)

1. Instaliraj **Obtainium**, kako je opisano u
   [MarkTube uputstvu](https://github.com/alertpay91/MarkTube#1-instaliraj-obtainium).
2. Na telefonu otvori ovu stranicu i dodirni **Get it on Obtainium**. Zatim dodirni
   **Continue**, pa **Add**.
   - Ručno: u Obtainium-u dodirni **+ Add** i nalepi `https://github.com/alertpay91/MarkBook`.
3. Dodirni dugme za preuzimanje pored MarkBook-a.
   - Prvi put dozvoli instaliranje (**Allow from this source**).
   - Kod Play Protect-a izaberi **Scan app**, pa **Install**.
4. Otvori MarkBook i prijavi se na Facebook.

### Poruke

Facebook-ov mobilni sajt ne prikazuje poruke, nego traži Messenger aplikaciju. MarkBook ih zato
otvara iz kompjuterske verzije Facebook-a, prilagođene ekranu telefona.

- Dodirni ikonicu poruka u gornjoj traci.
- Prvi put Facebook može da traži tvoj **PIN za šifrovana ćaskanja**: to je onaj iz
  Messenger-a, za vraćanje istorije.
- Prvo otvaranje posle pokretanja aplikacije može da potraje do pola minuta. Posle toga se poruke
  otvaraju odmah.
- Dugme nazad: iz razgovora vraća na listu, a sa liste na feed.

### Ažuriranja

- **Aplikacija:** ažurira se sama preko Obtainium-a. GitHub svake nedelje napravi novu verziju
  sa najnovijim Firefox motorom.
- **Blokator reklama (uBlock Origin):** ažurira se sam pri svakom pokretanju.

## 🇬🇧 English

**What MarkBook removes:**
- ads and sponsored posts;
- suggestion blocks: *People You May Know*, *Suggested for you*, *Reels*, and posts from pages you
  don't follow;
- the constant "Open app" prompts.

**No background activity:**
- MarkBook has no notifications and no background services.
- The page is paused as soon as you leave the app.
- It asks for no location, camera or microphone access.

**Download button:** the round ⬇ button on the right saves the photo or video in the middle of
the screen to the gallery (*Pictures/MarkBook*, *Movies/MarkBook*). Start a feed video first.
Facebook's mobile site serves video at 360p.

### Install

1. **Install Obtainium:** see the [MarkTube instructions](https://github.com/alertpay91/MarkTube#-how-to-install).
2. **Add MarkBook:** tap the **Get it on Obtainium** badge above on your phone.
   - Or add `https://github.com/alertpay91/MarkBook` manually.
3. **Install:** tap the download button next to MarkBook.
4. **Sign in** to Facebook.

### Messages

Facebook's mobile site has no inbox (it only says "Get the Messenger app"), so MarkBook opens
messages from the desktop site in a phone-sized view.
- Facebook may ask for your end-to-end encrypted chat PIN the first time.
- The first open after starting the app can take a little while.

### Updates

- **The app:** updates through Obtainium. GitHub Actions rebuilds it every week with the newest
  GeckoView.
- **uBlock Origin:** updates itself on every start.

Requires Android 8.0+ on a 64-bit ARM (arm64-v8a) phone.

## Build it yourself

```sh
./gradlew assembleRelease
```

- Release signing reads `keystore.properties`, which is not part of this repository.
- CI uses the repository secrets `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_ALIAS` and
  `KEY_PASSWORD`.

## Disclaimer

MarkBook is an independent, non-commercial project and is **not affiliated with, endorsed by, or
sponsored by Meta or Facebook**. "Facebook" and "Messenger" are trademarks of Meta Platforms, Inc.

MarkBook does not include or modify any Facebook software. It displays the public Facebook
website the way any web browser does, and only changes how that page looks on your own device.
Use it in line with the terms of the services you use.

## License

- MarkBook's own code is released under the [MIT License](LICENSE).
- GeckoView is © Mozilla and licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/).
- uBlock Origin is downloaded at runtime from addons.mozilla.org. It belongs to its authors and
  keeps its own license.
- The "Get it on Obtainium" badge comes from the [Obtainium](https://github.com/ImranR98/Obtainium)
  project, which invites projects to use it.
