# Salida de control CatalogDesign

Fecha: 2026-07-11T18:43:52.105Z
Estado: **PASSED**

## Resumen

- Casos auditados: 10
- Productos/cards de origen: 12
- Mocks de frente de origen: 86
- Entidades CatalogDesign resultantes: 55
- Errores de validación: 0

## Decisiones visibles en esta salida

- Slayer FMD Originals: 29 mocks de frente se agrupan en 15 diseños; los mocks de la misma idea por prenda no se duplican.
- Los designId actuales son transitorios. No se escriben en products.json hasta completar la revisión curatorial.

## Cobertura por caso

| Caso | IDs de origen | Mocks de frente | CatalogDesign |
|---|---|---:|---:|
| Megadeth - Rust in Peace | 4 | 5 | 5 |
| Slayer - FMD Originals | 7123 | 29 | 15 |
| Iron Maiden - Eddie Gaucho | 7040 | 3 | 1 |
| Metallica - Ride the Lightning | 1060 | 9 | 6 |
| EPICA | 5016 | 14 | 9 |
| Rhapsody | 5083, 6009, 6017 | 18 | 12 |
| HammerFall | 5089 | 5 | 5 |
| Banda con un diseño - King Diamond | 5058 | 1 | 1 |
| Abrigo específico - Hoodie Rust in Peace | 5062 | 1 | 1 |
| Personalizado - Diego Maradona | 5121 | 1 | 1 |

## Diseños

| designId | Nombre público | Banda | Frente | Dorsos | Prendas disponibles | Previews R/H/B | IDs origen | Código base |
|---|---|---|---|---|---|---|---|---|
| epica-20th-anniversary | 20th Anniversary | EPICA | images/banda_sugeridas/epica/remera_epica_20th_anniversary.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 5016 | EA2-5016.V2 |
| epica-aspiral | Aspiral | EPICA | images/banda_sugeridas/epica/remera_epica_aspiral.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5016 | EA2-5016.V1 |
| epica-design-your-universe | Design Your Universe | EPICA | images/banda_sugeridas/epica/remera_epica_design_your_universe.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5016 | EA2-5016.V3 |
| epica-logo | Logo | EPICA | images/banda_sugeridas/epica/remera_epica_logo.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5016 | EA2-5016.V4 |
| epica-omega | Omega | EPICA | images/banda_sugeridas/epica/remera_epica_omega.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5016 | EA2-5016.V5 |
| epica-omega-alive-dvd | Omega Alive DVD | EPICA | images/banda_sugeridas/epica/remera_epica_omega_alive_dvd.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5016 | EA2-5016.V6 |
| epica-the-holographic-principle | The Holographic Principle | EPICA | images/banda_sugeridas/epica/remera_epica_the_holographic_principle.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5016 | EA2-5016.V8 |
| epica-the-phantom-agony | The Phantom Agony | EPICA | images/banda_sugeridas/epica/remera_epica_the_phantom_agony.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5016 | EA2-5016.V9 |
| epica-the-quantum-enigma | The Quantum Enigma | EPICA | images/banda_sugeridas/epica/remera_epica_quantum.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 5016 | EA2-5016.V7 |
| hammerfall-crimson | Crimson | HammerFall | images/banda_sugeridas/hammerfall/hoodie_hammerfall_crimson.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 5089 | HHS-5089.V1 |
| hammerfall-glory-to-the-grave | Glory to the Grave | HammerFall | images/banda_sugeridas/hammerfall/hoodie_hammerfall_glory_to_the_grave.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 5089 | HHS-5089.V2 |
| hammerfall-legacy | Legacy | HammerFall | images/banda_sugeridas/hammerfall/hoodie_hammerfall_legacy.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 5089 | HHS-5089.V3 |
| hammerfall-renegade | Renegade | HammerFall | images/banda_sugeridas/hammerfall/hoodie_hammerfall_renegade.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 5089 | HHS-5089.V4 |
| hammerfall-steel | Steel | HammerFall | images/banda_sugeridas/hammerfall/hoodie_hammerfall_steel.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 5089 | HHS-5089.V5 |
| iron-maiden-eddie-gaucho-argentino | Eddie Gaucho Argentino | Iron Maiden | images/iron_maiden/remera_iron_maiden_eddie_gaucho_argentino.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7040 | IMEGAF-7040.V1 |
| king-diamond-abigail | Abigail | King Diamond | images/banda_sugeridas/king_diamond/remera_king_diamond_abigail.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5058 | KDDS-5058 |
| megadeth-3d | 3D | Megadeth | images/fmd-edition-3d/rust/rust_in_peace_3d_edition_frente.jpg | Rust in Peace 3D Dorso | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 4 | RIP-004.V9 |
| megadeth-alternate | Alternate | Megadeth | images/albums/Rust_in_peace/alternate-rip.jpg | Alternate Dorso | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 4 | RIP-004.V6 |
| megadeth-lineup | Lineup | Megadeth | images/albums/Rust_in_peace/rust_in_peace_lineup.jpg | Lineup Dorso | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 4 | RIP-004.V4 |
| megadeth-lineup-v2 | Lineup V2 | Megadeth | images/albums/Rust_in_peace/rust_in_peace_lineup_v2.jpg | Lineup Dorso NG | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 4 | RIP-004.V8 |
| megadeth-rust-in-peace | Rust in Peace | Megadeth | images/albums/Rust_in_peace/rust_in_peace.jpg | Dorso; v2 Dorso | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 4, 5062 | RIP-004.V1 |
| metallica-band-1984 | Band 1984 | Metallica | images/metallica/hoodie_metallica_ride_band_1984.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 1060 | RTL-1060.V10 |
| metallica-ride-clasico | Ride Clásico | Metallica | images/metallica/metallica_ride_the_classic.jpg | Dorso | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 1060 | RTL-1060.V1 |
| metallica-ride-mas-oscuro | Ride Más Oscuro | Metallica | images/metallica/metallica_ride_the_darker_light.jpg | Dorso Oscuro | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 1060 | RTL-1060.V3 |
| metallica-ride-the-lightning | Ride the Lightning | Metallica | images/metallica/remera_metallica_ride_the_lightning.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 1060 | RTL-1060.V5 |
| metallica-ride-the-lightning-v2 | Ride the Lightning V2 | Metallica | images/metallica/remera_metallica_ride_v2.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 1060 | RTL-1060.V6 |
| metallica-ride-the-lightning-v3 | Ride the Lightning V3 | Metallica | images/metallica/remera_metallica_ride_v3.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 1060 | RTL-1060.V7 |
| personalizados-diego-maradona | Diego Maradona | Personalizados | images/personalizado/diego_maradona.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5121 | DM-5121 |
| rhapsody-dawn-of-victory | Dawn Of Victory | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_dawn_of_victory.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5083 | RA2-5083.V1 |
| rhapsody-holy-thunderforce | Holy Thunderforce | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_holy_thunderforce.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5083 | RA2-5083.V10 |
| rhapsody-legendary-tales | Legendary Tales | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_legendary_tales.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5083 | RA2-5083.V2 |
| rhapsody-legendary-years | Legendary Years | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_legendary_years.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 5083 | RA2-5083.V3 |
| rhapsody-power-of-the-dragon-flame | Power Of The Dragon Flame | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_power_of_the_dragon_flame.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5083 | RA2-5083.V4 |
| rhapsody-rain-of-a-thousand-flames | Rain Of A Thousand Flames | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_raind_of_a_thounsand_flames.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 5083 | RA2-5083.V5 |
| rhapsody-rhapsody | Rhapsody | Rhapsody | images/hoddies_fmd/hoodies_otras_bandas/rapshody.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 6009 | HR-6009 |
| rhapsody-symphony-of-enchanted-lands | Symphony Of Enchanted Lands | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_symphony_of_enchanted_lands.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5083 | RA2-5083.V6 |
| rhapsody-symphony-of-enchanted-lands-ii | Symphony Of Enchanted Lands II | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_symphony_of_enchanted_lands_II.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 5083 | RA2-5083.V7 |
| rhapsody-tales-from-the-emerald-sword-saga | Tales From The Emerald Sword Saga | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_tales_from_the_emerald_sword_saga.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 5083 | RA2-5083.V8 |
| rhapsody-triumph-or-agony | Triumph Or Agony | Rhapsody | images/banda_sugeridas/rhapsody/remera_rhapsody_triumph_or_agony.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 5083 | RA2-5083.V9 |
| rhapsody-v1-v1 | V1 V1 | Rhapsody | images/hoddies_fmd/hoodies_otras_bandas/raphsody_v1.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 6017 | HRV-6017 |
| slayer-angel-of-death | Angel Of Death | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_angel_of_death.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V1 |
| slayer-hell-awaits | Hell Awaits | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_hell_awaits.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V2 |
| slayer-live-undead | Live Undead | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_live_undead.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 7123 | SFO-7123.V3 |
| slayer-logo | Logo | Slayer | images/slayer/fmd_originals/buzos/buzo_slayer_fmd_logo.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/0/1 | 7123 | SFO-7123.V22 |
| slayer-reign-in-blood-3d | Reign In Blood 3D | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_reign_in_blood_3D.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V4 |
| slayer-reign-in-blood-graphic | Reign In Blood Graphic | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_reign_in_blood_graphic.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V5 |
| slayer-seasons-in-the-abyss | Seasons In The Abyss | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_seasons_in_the_abyss.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V6 |
| slayer-seasons-in-the-abyss-v2 | Seasons In The Abyss V2 | Slayer | images/slayer/fmd_originals/hoodies/hoodie_slayer_fmd_seasons_in_the_abyss_v2.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 7123 | SFO-7123.V16 |
| slayer-show-no-mercy | Show No Mercy | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_show_no_mercy.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/1 | 7123 | SFO-7123.V7 |
| slayer-skull | Skull | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_skull.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/1 | 7123 | SFO-7123.V8 |
| slayer-soldier-v2-graphic | Soldier V2 Graphic | Slayer | images/slayer/fmd_originals/buzos/buzo_slayer_fmd_soldier_v2_graphic.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/0/1 | 7123 | SFO-7123.V28 |
| slayer-soldiers | Soldiers | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_soldiers.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/0/0 | 7123 | SFO-7123.V9 |
| slayer-south-of-heaven | South Of Heaven | Slayer | images/slayer/fmd_originals/remeras/remera_slayer_fmd_south_of_heaven.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 1/1/0 | 7123 | SFO-7123.V10 |
| slayer-south-of-heaven-graphic | South Of Heaven Graphic | Slayer | images/slayer/fmd_originals/buzos/buzo_slayer_fmd_south_of_heaven_graphic.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/0/1 | 7123 | SFO-7123.V29 |
| slayer-throne | Throne | Slayer | images/slayer/fmd_originals/hoodies/hoodie_slayer_fmd_throne.jpg | Ninguno | remera, hoodie, buzo_cuello_redondo | 0/1/0 | 7123 | SFO-7123.V19 |

## Validación

- Cero designId duplicados.
- Cero dorsos huérfanos.
- Cero imágenes inexistentes.
- Códigos base estables.
- Prendas disponibles independientes de los mocks.

## Nota de transición

Esta salida no modifica `products.json` ni el render público. Los `designId` inferidos sirven para validar el modelo. La migración permanente deberá escribir identificadores explícitos en los datos mediante backup, plan auditable y validador.
