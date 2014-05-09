<?php
require_once 'Log.php';
require_once 'HTTP/Request2.php';

require_once '../config.php';
require_once '../query.php';

$logger = Log::singleton('console', '', basename(__FILE__));

$stdin = fopen("php://stdin","r");

function pause()
{
    global $stdin;
    print '[Continue]' . PHP_EOL;
    return fgets($stdin);
}


// Test VirtuosoQuery

$q1 = new VirtuosoQuery('urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire');
$sparql1 = file_get_contents('examples/q0-virtuoso.sparql');
foreach (array('application/json', 'text/csv', 'text/html', 'application/rdf+xml') as $format) {
    $res1 = $q1->execute($sparql1, $format);
    var_dump($res1);
    pause();
}

// Test ParliamentQuery

$q2 = new ParliamentQuery('urn:x-geoknow-eu:sparql:parliament:metadata:inspire');
$sparql2 = file_get_contents('examples/q0-parliament.sparql');
foreach (array('application/json', 'text/csv', 'text/html', 'application/sparql-results+xml') as $format) {
    $res2 = $q2->execute($sparql2, $format);
    var_dump($res2);
    pause();
}

// Test CSW middleware

$q3 = new ParliamentQuery('urn:x-geoknow-eu:sparql:csw-middleware');
$sparql3 = file_get_contents('examples/q0-cswmiddleware.sparql');
foreach (array('application/rdf+xml') as $format) {
    $res3 = $q3->execute($sparql3, $format);
    var_dump($res3);
    pause();
}

