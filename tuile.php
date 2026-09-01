<?php
/**
 * UNE TUILE, LUE DANS NOTRE PROPRE FICHIER.
 * =========================================
 *
 * Pourquoi ce fichier existe : CARTO a commencé le 26/08/2026 à tamponner « API KEY REQUIRED »
 * dans les images qu'il nous servait. La carte est le squelette du produit et elle venait d'un
 * tiers ; elle vient désormais de chez nous.
 *
 * Le fond de carte est UN SEUL fichier `.pmtiles` — un conteneur de tuiles avec son index
 * dedans. On n'y touche jamais : on lit son en-tête, on suit ses répertoires, on renvoie les
 * octets d'une tuile. Aucun moteur de rendu, aucun processus long : le mutualisé n'en offre pas.
 *
 * ⚠️ LES TUILES SONT DÉJÀ COMPRESSÉES DANS LE FICHIER. On les renvoie telles quelles avec
 * `Content-Encoding: gzip` : ni décompression, ni recompression, donc presque zéro travail pour
 * le serveur — c'est ce qui rend la chose tenable sur du mutualisé.
 *
 * ⚠️ LE FICHIER LUI-MÊME NE DOIT PAS ÊTRE TÉLÉCHARGEABLE. Un demi-gigaoctet pour la seule
 * Belgique : servi en direct, il se ferait aspirer. C'est `.htaccess` qui le refuse ; ce
 * script, lui, le lit sur le disque.
 *
 * L'algorithme a été écrit et éprouvé EN PYTHON contre l'outil officiel `pmtiles` avant d'être
 * traduit ici : quatre tuiles, quatre niveaux de zoom, octet pour octet identiques, et toutes
 * passées par un répertoire-feuille (les neuf entrées de la racine y renvoient toutes).
 */

// LA TUNISIE SEULE : 78 396 435 octets, extraits le 30/08/2026 du build Protomaps du 29/08
// (données OSM du 29/08 à 04h00 UTC). Une édition = un pays, donc un fond de la taille du
// pays — inutile d'embarquer la planète. Sept fois plus léger que la Belgique de Terralog
// (542 Mo) : c'est la densité qui décide, pas la surface.
// Repris de Terralog (`~/Desktop/RoadTrip-Generique/tuile.php`) — SEULE cette ligne diffère.
const TUI_FICHIER    = __DIR__ . '/tuiles/fond.pmtiles';
const TUI_ZOOM_MAX   = 20;   // garde-fou : au-delà, on ne cherche même pas
const TUI_PROFONDEUR = 4;    // répertoires imbriqués au plus, contre un fichier mal formé

function tui_sortir(int $code, string $quoi = ''): void {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  echo $quoi;
  exit;
}

/** Un entier à taille variable, comme le format le range. */
function tui_varint(string $b, int &$i): int {
  $r = 0; $d = 0;
  while (true) {
    if (!isset($b[$i])) return 0;
    $c = ord($b[$i]); $i++;
    $r |= ($c & 0x7f) << $d;
    if (!($c & 0x80)) return $r;
    $d += 7;
  }
}

/**
 * L'identifiant d'une tuile n'est pas `z/x/y` : c'est sa position sur une **courbe de
 * Hilbert**, qui range côte à côte des tuiles voisines sur la carte. C'est ce qui permet de
 * lire une région entière en peu de morceaux — et c'est pour ça qu'on ne peut pas deviner
 * l'emplacement d'une tuile sans dérouler la courbe.
 */
function tui_identifiant(int $z, int $x, int $y): int {
  $acc = 0;
  for ($t = 0; $t < $z; $t++) $acc += (1 << $t) * (1 << $t);
  $n = 1 << $z; $d = 0; $s = $n >> 1;
  while ($s > 0) {
    $rx = ($x & $s) > 0 ? 1 : 0;
    $ry = ($y & $s) > 0 ? 1 : 0;
    $d += $s * $s * ((3 * $rx) ^ $ry);
    if ($ry === 0) {
      if ($rx === 1) { $x = $s - 1 - $x; $y = $s - 1 - $y; }
      $t = $x; $x = $y; $y = $t;
    }
    $s >>= 1;
  }
  return $acc + $d;
}

/** Un répertoire : les identifiants en écarts, puis les longueurs de suite, tailles, positions. */
function tui_repertoire(string $brut, int $compression): array {
  $b = ($compression === 2) ? @gzdecode($brut) : $brut;
  if ($b === false || $b === '') return [];
  $i = 0;
  $n = tui_varint($b, $i);
  if ($n <= 0 || $n > 500000) return [];
  $ids = []; $dernier = 0;
  for ($k = 0; $k < $n; $k++) { $dernier += tui_varint($b, $i); $ids[$k] = $dernier; }
  $suites = [];  for ($k = 0; $k < $n; $k++) $suites[$k]  = tui_varint($b, $i);
  $tailles = []; for ($k = 0; $k < $n; $k++) $tailles[$k] = tui_varint($b, $i);
  $pos = [];
  for ($k = 0; $k < $n; $k++) {
    $v = tui_varint($b, $i);
    // ⚠️ Un zéro ne veut PAS dire « position zéro » : il veut dire « juste après la
    // précédente ». C'est ce qui rend le fichier compact, et ce qui casse en SILENCE si on
    // l'oublie — les tuiles sortiraient décalées, pas absentes. Rien ne le signalerait.
    $pos[$k] = ($v === 0 && $k > 0) ? ($pos[$k-1] + $tailles[$k-1]) : ($v - 1);
  }
  $out = [];
  for ($k = 0; $k < $n; $k++) $out[] = [$ids[$k], $suites[$k], $pos[$k], $tailles[$k]];
  return $out;
}

// ── La demande ───────────────────────────────────────────────────────────────
$z = filter_input(INPUT_GET, 'z', FILTER_VALIDATE_INT);
$x = filter_input(INPUT_GET, 'x', FILTER_VALIDATE_INT);
$y = filter_input(INPUT_GET, 'y', FILTER_VALIDATE_INT);
if ($z === false || $z === null || $x === false || $x === null || $y === false || $y === null) tui_sortir(400, 'z, x, y');
if ($z < 0 || $z > TUI_ZOOM_MAX) tui_sortir(404);
$cote = 1 << $z;
if ($x < 0 || $y < 0 || $x >= $cote || $y >= $cote) tui_sortir(404);

$f = @fopen(TUI_FICHIER, 'rb');
if (!$f) tui_sortir(503, 'pas de fond de carte');

$tete = fread($f, 127);
if (strlen($tete) < 127 || substr($tete, 0, 7) !== 'PMTiles' || ord($tete[7]) !== 3) {
  fclose($f); tui_sortir(503, 'fond de carte illisible');
}
$q = unpack('Pracine/Ptracine/Pjson/Ptjson/Pfeuilles/Ptfeuilles/Pdonnees/Ptdonnees', substr($tete, 8, 64));
$compression = ord($tete[97]);   // celle des répertoires
$compTuile   = ord($tete[98]);   // celle des tuiles
$zmin = ord($tete[100]); $zmax = ord($tete[101]);
if ($z < $zmin || $z > $zmax) { fclose($f); tui_sortir(404); }

$cible = tui_identifiant($z, $x, $y);
$pos = $q['racine']; $len = $q['tracine']; $trouve = null;

for ($tour = 0; $tour < TUI_PROFONDEUR; $tour++) {
  fseek($f, $pos);
  $rep = tui_repertoire(fread($f, $len), $compression);
  if (!$rep) break;
  // la dernière entrée dont l'identifiant ne dépasse pas le nôtre
  $lo = 0; $hi = count($rep) - 1; $k = -1;
  while ($lo <= $hi) {
    $m = intdiv($lo + $hi, 2);
    if ($rep[$m][0] <= $cible) { $k = $m; $lo = $m + 1; } else { $hi = $m - 1; }
  }
  if ($k < 0) break;
  [$eid, $suite, $epos, $elen] = $rep[$k];
  if ($suite === 0) { $pos = $q['feuilles'] + $epos; $len = $elen; continue; }  // un répertoire de plus
  if ($cible < $eid + $suite) { fseek($f, $q['donnees'] + $epos); $trouve = fread($f, $elen); }
  break;
}
fclose($f);
if ($trouve === null || $trouve === '' || $trouve === false) tui_sortir(404);

// ── La réponse ───────────────────────────────────────────────────────────────
// Une tuile ne change jamais pour un fond donné : on la laisse se garder un an. C'est ce qui
// permet au service worker de la reprendre telle quelle pour le hors réseau — le mécanisme de
// `95-emporter` n'a pas à changer, seule l'adresse change.
header('Content-Type: application/x-protobuf');
header('Cache-Control: public, max-age=31536000, immutable');
if ($compTuile === 2) {
  if (stripos($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip') !== false) {
    header('Content-Encoding: gzip');     // telle quelle : le serveur ne travaille pas
  } else {
    $trouve = gzdecode($trouve);          // le cas rare, on paie la décompression
    if ($trouve === false) tui_sortir(500);
  }
}
header('Content-Length: ' . strlen($trouve));
echo $trouve;
