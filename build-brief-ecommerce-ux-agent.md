# Build-brief: Interní e-commerce / UX newsletter agent (v1)

> Vstup pro Claude Code. Zachycuje scope, architekturu, datový model a otevřená rozhodnutí. Záměrně **nepředepisuje konkrétní stack** (jazyk, knihovny, hosting) — to nech na fázi implementace; brief definuje *co* a *proč*, ne *čím*.

---

## 1. Účel a scope

**Co to je:** Interní recall nástroj pro UX agenturu. Jednou týdně sestaví a rozešle týmu digest nejdůležitějšího dění v české e-commerce z pohledu UX — trendy, legislativní povinnosti, dění na trhu. Cíl #1: tým je up-to-date bez ručního úsilí. Cíl #2 (mimo v1, ale neztrácet ze zřetele): tatáž datová báze později nakrmí klientský newsletter.

**Publikum v1:** interní tým UX expertů. To je zásadní pro kalibraci přesnosti — publikum samo je precision filtr, cena chyby ve výstupu je nízká (expert vatový item pozná). Klientské publikum to **není** a brief s tím počítá jen v návrhu úložiště, ne v chování.

**Trh:** Česko. Typický klient agentury **není** na Shoptetu (jde o větší, custom-build e-shopy). Shoptet proto **není dedikovaný monitorovaný zdroj** — jen oportunistický pickup jeho tržních reportů přes kategorii „tržní kontext".

**Kadence a objem:** týdně, řízeno signálem, ne kvótou. Strop ~10 podnětů; pokud stojí za pozornost dva, vyjdou dva. Prázdný týden je legitimní výstup (viz heartbeat — prázdno se nesmí plést s výpadkem).

### Explicitně MIMO scope v1
- Klientský newsletter (odložen; úložiště se ale staví tak, aby ho později obsloužilo).
- Oddělená pipeline / oddělené UI pro legislativní tracker (sloučeno s feedem — viz §2).
- Blokující brána před rozesláním, záskok-schvalovatel, eskalace nečinnosti (odpadlo, když je rozeslání autonomní).
- Robustní entity resolution a sofistikovaný merge (odloženo, dokud objem kandidátů nedonutí — viz §10).
- Custom CRUD administrace (použij hotové úložiště — viz §10).

---

## 2. Architektonický princip

**Jeden výstup, dva vnitřní režimy.** Feed a legislativní tracker sdílejí jeden výstupní kanál (jeden newsletter) a jednu review frontu, ale uvnitř se chovají odlišně:

- **Feed** (emergentní, bursty: výzkum, trh, platformní změny) — režim tolerantní k šumu. Občasné opakování itemu nevadí, neřeš ho chytře hned.
- **Legislativa** — stavový, striktně **událostně řízený** režim. Položka se ukáže jen při události, ne kvůli tomu, že je „relevantní" (viz §4). Tohle není nice-to-have; je to důvod, proč tracker existuje.

> **Past, které se vyhnout:** „sloučit do feedu" nesmí znamenat „zahodit stav". Sloučit *prezentaci* ano. Stavovou tabulku legislativy (ID, effective_date, status) drž — bez ní nejdou tři event-triggery vůbec spočítat.

**Dělba recall / precision.** Agent dělá recall (radši over-surface uvnitř allowlistu), člověk dělá precision. Konkrétně se to ale štěpí na dvě brány s odlišnou cenou chyby:

| Operace | Kdo rozhoduje | Proč |
|---|---|---|
| **Rozeslání týdenního newsletteru** | **Autonomní** | Interní publikum = precision filtr; cena chyby nízká; blokující brána by popřela cíl „nemyslet na to týdně". |
| **Mutace trackeru** (nová položka / update) | **Člověk schvaluje, neblokujícím způsobem** | Tracker je trvalé kumulativní aktivum; chyby entity resolution se tiše hromadí (duplicitní EAA, špatné datum). |

Klíč: **rozeslání neblokuje na schválení trackeru.** Newsletter čte *potvrzený* stav trackeru + feed a jede autonomně. Kandidáty na mutaci agent frontuje; člověk po nich sáhne, *když nějaké jsou* (řídké — třeba jednou za pár týdnů), ne každé pondělí.

---

## 3. Datový model — legislativní položka (stav)

Každá položka trackeru musí nést:

- `id` — stabilní identifikátor (kotva pro entity resolution; aby se update navázal, ne vytvořil duplikát).
- `effective_date` — datum účinnosti / deadline. **Editovatelné** (legislativa klouže). Změna tohoto data je sama o sobě materiální událost.
- `status` — enum: `navrženo` → `schváleno` → `účinné` → `vymáháno`. Změna statusu je událost.
- `last_material_change` — datum + krátký popis, co se změnilo. Kotva pro detekci změn (§4 trigger 2).
- `remediation_weight` — náročnost nápravy (např. `lehká` / `těžká`). Určuje horizonty připomínání (§4).
- `fired_flags` — per typ události / per horizont, aby se totéž upozornění nepálilo opakovaně.
- `confirmed` — bool. Newsletter renderuje jen potvrzené položky.
- segment / relevance tag (volitelně) — komu z klientského portfolia to je relevantní; připraví pozdější filtrování pro klientský výstup.

---

## 4. Logika událostí (legislativa)

**Suppression pravidlo (jádro):** legislativní položka se v newsletteru objeví **jen při události, ne při existenci.** Konkrétně se zobrazí, když:

1. **Je nově přidaná** (a potvrzená člověkem).
2. **Měla materiální změnu** od posledního vydání.
3. **Překročila reminder-horizont** (T-minus).

Jinak mlčí, i když je pořád „relevantní". Bez tohoto pravidla EAA kandiduje každý týden donekonečna, newsletter se utopí v šumu a — důležitější — zanikne T-minus signál (když položku vidíš každý týden, „T-30, teď jednat" splyne s předchozími výskyty).

### Trigger 1 — nová položka
Agent **navrhne** („vypadá to jako nová položka"), **nemutuje autonomně**. Člověk potvrdí, zda je nová, nebo jde o update existující. Důvod: entity resolution agent spolehlivě sám nezvládne, a chyba korumpuje durable stav.

### Trigger 2 — materiální změna
Rozlišuj **změnu ve světě** (nová guidance ČOI, soudní rozhodnutí, novela, vymáhací akce → materiální) vs. **změnu v pokrytí** (další blog popáté přežvýká totéž → re-reportáž, NENÍ změna). 

> **Sourcing constraint:** change-detection čte **jen z primárních/autoritativních zdrojů** (§5 skupina A). Sekundární zdroje smí krmit feed, ale **nesmí** spustit „tohle se změnilo". Míchání = každý explainer vyvolá falešný poplach.

Agent surface-uje kandidáta s diffem; materialitu potvrzuje člověk. *Děravá detekce změny je OK doladit za běhu* — ladí se přesnost, ne integrita.

### Trigger 3 — blížící se termín (T-minus)
Čistá aritmetika nad `effective_date`, nula úsudku, autonomní (spolehlivější než člověk — nezapomene). **Vícestupňové, škálované náročností nápravy**, ne plošné:

- `remediation_weight = lehká` (např. „přidat tlačítko"): T-30 / T-7.
- `remediation_weight = těžká` (např. celý web na WCAG 2.1 AA): **T-90** / T-30 / T-7 — první horizont je tu obchodně nejcennější (dlouhý lead-time = „máte 90 dní, pojďme to naplánovat").

Pozn.: triggery 2 a 3 nejsou nezávislé — posun `effective_date` je materiální událost a zároveň přepočítává horizonty.

---

## 5. Zdroje (allowlist)

Rozdělení podle **oprávnění spouštět legislativní událost**, ne podle obecné kredibility.

### Skupina A — primární / autoritativní (SMÍ spustit trigger 2 „materiální změna")
- Sbírka zákonů / e-Sbírka (primární legislativa)
- **ČOI — coi.cz, vč. kontrolních zpráv** (nejvyšší konverzní hodnota: říká, co se *teď vymáhá* a kde shopy padají)
- EUR-Lex (směrnice/nařízení EU, pro lead-time před transpozicí)
- ÚOOÚ (consent / GDPR výklady), soudní rozhodnutí — dle relevance

### Skupina B — sekundární (jen feed; NESMÍ spustit legislativní událost)
- Advokátní blogy (eLegal, Sedlakova Legal, …) — užitečný kontext a srozumitelný výklad, ale re-reportáž
- APEK, Heureka eCommerce Insider — tržní data
- Baymard Institute — empirický UX výzkum (autoritativní *pro výzkum*, ne pro legislativu)
- Prohlížečové changelogy (Chrome/Safari — ITP, consent), platební changelogy — feed kategorie „platformní změny"
- E-commerce média (CzechCrunch, Lupa, …), oportunisticky Shoptet tržní reporty

> Allowlist drž jako **konfiguraci**, ne hardcode — bude se ladit. Otevřené scrapování „ecommerce UX trends" nepoužívej: vrátí převážně cizí PR a US/Shopify-centrický obsah, který na CZ trh nemapuje.

---

## 6. Taxonomie pokrytí (5 kategorií, CZ)

1. **Regulatorní tracker** — primárka + ČOI kontrolní zprávy. (Stavový režim dle §4.)
2. **Platformní / infra změny** vynucující UX úpravy — prohlížeče/consent, platební rails. (Shoptet jen oportunisticky, ne jako monitoring.)
3. **Český checkout & důvěra** — výběr výdejního místa (Zásilkovna/Packeta, Balíkovna, boxy); Heureka/Zboží.cz feedy + „Ověřeno zákazníky"; platby (dobírka, Comgate, GoPay, BNPL/Skip Pay); labeling ověřených vs. neověřených recenzí. *(Tohle generický feed mine — proto vlastní kategorie.)*
4. **Empirický UX výzkum** — Baymard-typ, mezinárodní, filtrovaný osou akčnosti.
5. **Tržní kontext** — konsolidace (Mall/CZC/Okay zmizeli), vstup Allegro, čínská tržiště + celní/de-minimis změny.

---

## 7. Inkluzní rubrika (recall filtr, NE finální ranking)

Checklist pro agenta i člověka — **co se vůbec dostane na stůl**. Drž volnější, než se zdá (recall > precision; člověk pak dělá 10 → 2–3). Není to skórovací vzorec (osy nejsou nezávislé):

- **Akčnost** — implikuje to změnu na webu klienta? *(nejtvrdší filtr)*
- **Deadline tlak**
- **Šíře dopadu** — většina e-shopů vs. nika *(pozor: systematicky podvažuje specializované, ale pro konkrétního klienta klíčové věci → proto checklist, ne váha)*
- **Kvalita evidence** — empirická studie vs. názor na blogu
- **Novost** — nové vs. recyklát

---

## 8. Seed legislativní položky (ověřeno v návrhu — datum ověř před použitím)

> **Varování:** `effective_date` u každé položky **ověř z primárního zdroje** (Skupina A) předtím, než ho pustíš do T-minus aritmetiky. Data z SEO blogů nepoužívej jako zdroj pravdy.

- **EAA / zákon č. 424/2023 Sb.** — přístupnost, účinnost 28. 6. 2025, WCAG 2.1 AA, výjimka pro mikropodniky (<10 zam. *a zároveň* obrat < 2 mil. €), pokuta až 10 mil. Kč, vymáhá ČOI. `remediation_weight = těžká`.
  - **Druhá vlna ~2030** (na ty, kdo mají dnes výjimku) — založ jako budoucí položku; ukázkový případ hodnoty dlouhého lead-time.
- **Omnibus / sleva z nejnižší ceny za 30 dní** — ČOI aktivně pokutuje.
- **Ověřování recenzí** (ověřené vs. neověřené) — ČOI aktivně pokutuje.
- **Online odstoupení od smlouvy („tlačítko")** — chystané ~polovina 2026, § 1829 OZ / směrnice 2023/2673. **Datum NEJISTÉ — ověř z primárky, nehardcoduj.**
- **GPSR** (bezpečnost výrobků) — od konce 2024.
- **DSA** — pro weby s uživatelským obsahem (recenze, diskuze).

---

## 9. Nasazení & automatizace

**Cyklus:**
- **Neděle (~18:00):** agent autonomně proběhne, sestaví digest z *potvrzeného* stavu trackeru + feedu.
- **Pondělí ráno (~07:00):** autonomní rozeslání týmu na adresy z administrace.
- (Neděle/pondělí split dává buffer a okno na heartbeat. Doručení v pondělí ráno je fixní bod — od něj počítej běh zpět.)

**Heartbeat (nepodkročitelné):** po *každém* běhu pošli **majiteli** (ne týmu) potvrzení: „proběhlo, zpracováno X zdrojů, Y kandidátů, Z chyb" — **i když je výstup prázdný**. Pozitivní potvrzení, ne jen alert při chybě. Absence heartbeatu = signál „cron umřel".

**Tichý fail — explicitně ošéfovat** (cron zaručí *spuštění*, ne *správný průběh*):
- zdroj změní strukturu → scrape vrátí prázdno (vypadá jako „klidný týden", přitom jsi slepý)
- RSS zmlkne / LLM krok vrátí prázdný JSON / SMTP spadne („rozesláno" do void)
- → per-source success/failure counts v heartbeatu; prázdný výstup odliš od failnutého zdroje.

**Degradace kvality:** 👍/👎 v newsletteru jako levná pojistka proti plíživé degradaci (nahrazuje forcing-function, kterou by jinak dělala blokující brána). Plus občasný namátkový pohled majitele.

---

## 10. Úložiště & administrace

**Reuse-first.** Tracker jsou strukturovaná stavová data — to hotové nástroje (Airtable / Notion DB / příp. Google Sheet) dělají out-of-the-box, vč. editačního UI, audit trailu, více uživatelů, **autentizace** a obousměrného API (agent zapisuje kandidáty, čte stav pro T-minus). Skrytý požadavek: ať zvolíš cokoli, **musí mít slušné API oběma směry**.

**Custom postav jen jednu obrazovku** — a jen pokud ji objem vynutí: **merge view pro entity resolution** („agent míní, že kandidát je update položky X — diff — approve / merge / reject"). To je ta gnarly část, kde je hotový nástroj nejslabší. Pár kandidátů týdně → klidný i neelegantní merge v hotovém nástroji. Desítky → vyplatí se ta jedna obrazovka na míru (ale jen ona, ne celý admin).

**Auth:** administrace **za přihlášením**. Odkaz z e-mailu vede na login, ne magic link.

**Adopce > elegance:** schvalovací plocha musí žít blízko tomu, kde tým pracuje — jinak se precision krok reálně dít nebude a nástroj tiše umře. Další argument pro reuse.

**Single source of truth:** tohle úložiště pozdě nakrmí i klientský newsletter — vybírej ho s tím vědomím, není to throwaway.

**Administrace musí umět spravovat** (mj.): seznam mailových adres týmu (příjemci), allowlist zdrojů (Skupina A / B), potvrzování a editaci položek trackeru.

---

## 11. Otevřené rozhodnutí / přijaté předpoklady

- **Suppression — tvrdé vs. měkké.** Tahle otázka nezůstala potvrzena. **Předpoklad v1: tvrdé pravidlo** (legislativa se ukáže jen na událost, §4) — slouží autonomii a menší ruční zátěži, konzistentní s „doladíme za běhu". Pokud chceš ruční pojistku (člověk při sestavování odškrtne, co tenhle týden pustit), je to měkká varianta, ale vrací týdenní zásah. **Potvrď nebo přepiš.**
- **Custom merge view ano/ne** — rozhodni *až* podle reálného objemu merge kandidátů, ne dopředu. Start bez něj.

---

## 12. Pořadí stavby (návrh)

1. Úložiště (hotové) + schéma trackeru (§3) + seed položky (§8, s ověřenými daty).
2. Sběrný agent nad allowlistem (§5) → feed kandidáti + legislativní kandidáti do fronty.
3. Event-logika (§4): T-minus aritmetika + suppression + diff pro materiální změnu.
4. Skládání digestu z potvrzeného stavu + feed → render → autonomní rozeslání (§9).
5. Heartbeat + per-source counts (§9). *(Neodkládej — je to levné a chrání před tichým failem.)*
6. 👍/👎 signál.
7. Merge view — jen pokud §10 objem vynutí.
