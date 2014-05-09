<?php
require_once 'Log.php';
require_once 'HTTP/Request2.php';

require_once '../config.php';
require_once '../query.php';

$logger = Log::singleton('console', '', basename(__FILE__));

// Test QueryFactory

$q1 = QueryFactory::create('urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire');

$q2 = QueryFactory::create('urn:x-geoknow-eu:sparql:parliament:metadata:inspire');

$q3 = QueryFactory::create('urn:x-geoknow-eu:sparql:csw-middleware');

$q4 = QueryFactory::create('urn:x-geoknow-eu:sparql:foo');

