<?php
//
// Example invocation:
//    php test-api.php urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire examples/q0-virtuoso.sparql
//

require_once 'Log.php';
require_once 'HTTP/Request2.php';

require_once '../config.php';
require_once '../query.php';

$logger = Log::factory('console', '', basename( __FILE__));

if (count($argv) < 3) {
    print 'Usage: ' . $argv[0] . '<urn> <sparql-file>' . PHP_EOL;
    exit(0);
}

$urn = $argv[1];
$sparql_file = $argv[2];
$sparql = file_get_contents($sparql_file);

$q = QueryFactory::create($urn);
$res = $q->execute($sparql, 'application/json');
var_dump($res);

