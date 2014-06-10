<?php

/**
 * The frontend API endpoint expects (as GET or POST parameters) 
 *   - graph_uri: URI
 *   - result_format: MIME type
 *   - query: SPARQL   
 *   - op: one of {'preview', 'download'}
 **/

require_once 'Log.php';
require_once 'Net/URL2.php';
require_once 'HTTP/Request2.php';

require_once 'config.php';
require_once 'query.php';

$logfile = $config['logfile'];
$logger = Log::singleton('file', $logfile, basename(__FILE__));

//
// Helpers
// 

function input($param, $default_value = null)
{
    if (isset($_REQUEST[$param])) {
        return $_REQUEST[$param];
    } else {
        return $default_value;
    }
}

function handle_request()
{
    global $config;
    global $logger;

    $response_headers = array();

    $result_formats =& $config['result_formats'];
   
    // Validate request

    $result_format = input('result_format');
    if (!is_null($result_format) and !isset($result_formats[$result_format])) {
        header('HTTP/1.1 400 Bad Request', true, 400);
        print "Unknown format";
        return;
    }

    $graph_uri = input('graph_uri');
    
    $max_query_length = (int) $config['limits']['query_length'];
    $query = input('query');
    if (empty($query)) {
        header('HTTP/1.1 400 Bad Request', true, 400);
        print 'Query is empty';
        return;    
    } elseif (strlen($query) > $max_query_length) {
        header('HTTP/1.1 400 Bad Request', true, 400);
        print "Query is too large (> ${max_query_length} bytes)"; 
        return;    
    }

    // Execute query on backend
    
    $q = QueryFactory::create($graph_uri);
    $r = $q->execute($query, $result_format);
    if (!$r['success']) {
        header('HTTP/1.1 400 Bad Request', true, 400);
        print $r['message']; 
        return; 
    }

    // Success: output results with proper headers

    header("Content-Type: ${result_format}");
    
    $op = input('op', 'preview'); 
    switch ($op) {
    case 'download':
        $ext = $result_formats[$result_format]['extension'];
        header("Content-Disposition: attachment; filename=result.${ext}");
        break;
    case 'preview':
    default:
        header("Content-Disposition: inline");
        break;
    }

    print $r['result'];

    return;
}

//
// Main
//

handle_request(); 

exit(0);
