# Audit — Coach Dashboard (Revelstoke Grizzlies)

Stav k 10. 6. 2026. TypeScript prochází bez chyb. Rozhodnutí: UI kompletně anglicky.

---

## P1 — Funkční chyby a bezpečnost

> Stav 10. 6. 2026: ✅ 1 (login + proxy), ✅ 3 (výsledky z DB, + sloupce shootout/final), ✅ 4 (vráceno původní řádkové zobrazení, mrtvý kód smazán), ✅ 5, ✅ 6. — 2 (mobil) odloženo na konec, 7 (rok narození) se řešit nebude.

**1. Žádná autentizace.** Všechny API routes (POST/PUT/DELETE na games, lineups, notes, players, events) jsou veřejné. Kdokoliv se zná URL nasazené aplikace, může smazat zápasy, sestavy i poznámky. Minimálně basic auth / middleware s heslem, ideálně před celou aplikací. Souvisí: chybí `noindex` — interní nástroj by neměl být indexovaný.

**2. Rozbitý mobilní layout LineupBuilderu.** `LineupBuilder.tsx:513` — inline `style={{ gridTemplateColumns: '3fr 7fr' }}` přebije `grid-cols-1`, takže i na mobilu se vynucují dva sloupce. Přesunout do `xl:` Tailwind třídy.

**3. Výsledky se nečtou z DB.** Sync zapisuje `home_score/away_score/overtime` do tabulky `games`, ale UI je nikde nečte — `games/page.tsx` i `games/[id]` staví výsledky znovu z živého API fetche. Důsledek: u ručně přidaných zápasů (turnaje, přáteláky) nejde nikdy zadat ani zobrazit výsledek. Buď číst skóre z DB, nebo přidat formulář pro ruční zadání výsledku.

**4. Mrtvý/zavádějící kód v `games/page.tsx`.** Řádek 65: `const teamId = window.location.hostname // placeholder` — nepoužitá proměnná s matoucím komentářem. Komponenta `GameRow` má celou `past` větev, která se nikdy nespustí (pro minulé zápasy se používá `GameRowNew`). Smazat.

**5. Nefunkční hover v kalendáři.** `schedule/page.tsx:437` — `hover:bg-white/3` není platná Tailwind třída (opacity 3 neexistuje v defaultní škále). Použít `hover:bg-white/[0.03]` nebo `hover:bg-white/5`.

**6. Neplatné HTML — `<button>` uvnitř `<a>`.** Roster (mazání manuálních hráčů, ř. 394) — tlačítko vnořené v odkazu je invalidní a chová se nespolehlivě. Předělat na pozicovaný sourozenec.

**7. Tlachající rok narození.** `roster/[slug]/page.tsx:213` — `birthdate_year.replace(/^'/, '20')` udělá z `'99` rok `2099`. U juniorky teď nevadí, ale je to časovaná bomba.

---

## P2 — Obsah a funkčnost

**8. Stránka `/lineup` je sirotek.** Existuje, ale není v navigaci. Buď přidat do menu (jako „rychlá sestava bez zápasu"), nebo smazat — funkčnost dubluje lineup v detailu zápasu.

**9. NextOpponent zobrazuje název sezóny místo soupeře.** `NextOpponent.tsx:35` — pod „Next Opponent" se vypisuje `rosterData.seasonName`. Má tam být jméno týmu (město + přezdívka).

**10. Výsledek „T" (remíza).** `ScheduleWidget` a games page počítají s remízou — v junior hokeji neexistuje (OT/SO vždy rozhodne). Spíš kosmetika, ale label „T" mate.

**11. Hardcoded ID týmu „19".** Logo v `layout.tsx` a v PNG exportu má napevno `kijhl/logos/19.jpg`, přitom existuje `TEAM_ID` v env. Při změně týmu se rozbije.

**12. Chybí zadání místa/poznámky k manuálnímu zápasu na dashboardu.** Manuální zápas na dashboardu nezobrazuje čas, jen datum.

**13. ✅ Mix češtiny v UI — sjednoceno na EN (UI texty i komentáře v kódu).**
- `page.tsx` (dashboard): „Otevřít sestavu →" + datum v `cs-CZ` (zbytek aplikace `en-CA`)
- `LineupBuilder.tsx`: export okno „Pravý klik → Uložit obrázek jako…", alert „Export selhal"
- `PlayerStatsWithToggle` + `TopScorersWithToggle`: tab „Základní část" → „Regular Season"
- české komentáře v kódu (Číslo, Foto, Jméno…) — nevadí funkčně, ale sjednotit

**14. Duplicitní kód.**
- `EMPTY_LINEUP` definovaný 2× (LineupBuilder, MatchLineupBuilder)
- `playerSlug`/`norm` definované 2× (roster/page, roster/[slug]/page) — při změně logiky se rozjedou a rozbijí se URL
- `TeamLogo` existuje 2× (components/TeamLogo.tsx a lokálně v GameResult.tsx)
- silueta hráče (SVG) zkopírovaná 3×
→ vytáhnout do `src/lib/slug.ts` a sdílených komponent

**15. Navigace přes `<a>` místo `next/link`.** Každý klik = full page reload. Nahradit `Link` — okamžitá navigace, zachová se scroll stav.

**16. Nekonzistentní feedback při synci.** Games page: `alert()`. Schedule page: inline text. Roster: nic. Sjednotit (inline text/toast, žádné alerty).

**17. PDF export — diakritika.** jsPDF s vestavěnou helveticou neumí české/evropské znaky; jména s diakritikou (např. evropští hráči) se vykreslí špatně. Buď embedovat font (Roboto/Inter TTF), nebo akceptovat ASCII-only.

---

## P3 — Stylová stránka

**18. Nekonzistentní světlé/tmavé karty.** Roster karty a nadcházející zápasy = bílé, minulé zápasy a vše ostatní = tmavé sklo (`bg-white/5`). Působí to nahodile. Rozhodnout: bílé karty jen pro „aktivní/akční" prvky, nebo sjednotit vše na tmavou.

**19. Barvy událostí mimo paletu.** Kalendář: training = modrá, meeting = fialová — neladí s klubovou navy/red/gold. Navrhnout odstíny z palety (např. gold pro training, desaturovaná red pro meeting).

**20. Typografie.** Žádný vlastní font — systémový default. `globals.css` je prázdný. Zvážit jeden display font pro čísla dresů/nadpisy (např. Archivo/Inter via `next/font`) a definovat škálu velikostí — teď se míchá `text-xs`, `text-[10px]`, `text-[11px]`, inline `fontSize: '1.2rem'`…

**21. Inline styly vs. Tailwind.** Hodně `style={{ fontSize, width, height }}` tam, kde existují Tailwind utility. Ztěžuje konzistenci a responzivitu.

**22. Chybějící stavy.** Loading je všude jen text „Loading…" — zvážit skeleton karty. Prázdné stavy OK.

**23. Mobil obecně.** Hlavička s navigací se na úzkém displeji nevejde (4 položky + logo, žádný hamburger/zalomení). Tabulky statistik mají `overflow-x-auto` (OK), ale profilová karta hráče (fixní výška 160, foto 195px) se na mobilu rozbije.

**24. Favicon a meta.** Chybí favicon/ikona, `theme-color`, og: tagy. U interního nástroje stačí favicon + theme-color + `noindex`.

---

## Drobnosti

- `package.json` name `kijhl-dashboard` vs. titulek „Revelstoke Grizzlies Dashboard" — sjednotit
- fotky manuálních hráčů se ukládají jako base64 do DB — funguje, ale poroste velikost řádků; pro pár hráčů OK
- `confirm()` dialogy pro mazání — funkční, ale nekonzistentní se zbytkem designu
- kalendář začíná nedělí (kanadská konvence) — nechat, tým je kanadský
- `.env.local` správně v `.gitignore` ✓

---

## Plánované funkce

- ✅ **Speciální formace v lineup builderu** — hotovo: tab Special Teams (PP1+PP2, PK1+PK2), ukládání jako typ `special`, druhá strana PDF exportu.

## Navržené pořadí prací

1. **Bezpečnost + bugy (P1):** auth middleware, mobilní grid, výsledky z DB, mrtvý kód, hover, vnořený button
2. **Obsah (P2):** /lineup rozhodnutí, NextOpponent fix, jazyk → EN, deduplikace, next/link
3. **Styl (P3):** sjednocení karet, paleta událostí, font + typografická škála, mobil, favicon
