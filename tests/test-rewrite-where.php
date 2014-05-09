<?php
require_once 'Log.php';

require_once '../config.php';

$logger = Log::singleton('console', '', basename(__FILE__));

$urn = 'urn:x-geoknow-eu:sparql:parliament:metadata:inspire';
$examples_dir = "../examples/${urn}";

$stdin = fopen("php://stdin","r");

function pause()
{
    global $stdin;
    print '[Continue]' . PHP_EOL;
    return fgets($stdin);
}

function find_matching_bracket($s, $start=0)
{
    assert(substr($s, $start, 1) == '{');
    return 42;
}

foreach (glob("${examples_dir}/*.sparql") as $file) {
    $sparql = file_get_contents($file);
    $logger->info('Rewriting WHERE clause for ' . $file . ":\n" . $sparql);
    preg_match('/\bWHERE[[:space:]]*{/i', $sparql, $match1, PREG_OFFSET_CAPTURE);
    print_r($match1);
    if (empty($match1)) {
        continue;
    }
    $off1 = $match1[0][1];
    $part1 = trim(substr($sparql, 0, $off1));
    $where_starts = $off1 + strlen($match1[0][0]) -1;
    assert(substr($sparql, $where_starts, 1) == '{');
 
    print '1:' . $part1 . PHP_EOL;
    print ' -- ' .PHP_EOL;
    
    preg_match('/\{(?:(?>[^\{\}]+)|(?R))*\}/', $sparql, $match2, PREG_OFFSET_CAPTURE, $where_starts);
    if (empty($match2)) {
        continue;
    }
    $off2 = $match2[0][1];
    if ($off2 != $where_starts) {
        continue;
    }
    $off3 = $where_ends = $off2 + strlen($match2[0][0]) -1;
    assert(substr($sparql, $where_ends, 1) == '}');

    $where_clause = trim(substr($sparql, $off2 +1, $off3 - $off2 -1), "\r\n");

    $part2 = trim(substr($sparql, $off3 +1));

    print '2:' . $where_clause . PHP_EOL;
    print ' -- ' .PHP_EOL;
    
    print '3:' . $part1 . PHP_EOL;
    print ' -- ' .PHP_EOL;
        
    print ' -- Rewritten -- ' . PHP_EOL;
    print "${part1}\nWHERE {GRAPH <urn:x-foo> {\n${where_clause}\n}}\n${part2}" .PHP_EOL; 
    print ' -- ' .PHP_EOL;
    pause();
}


