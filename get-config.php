<?php

require_once 'config.php';

$return = array();

$return['graphs'] = array_map(function ($graph) {
    return array(
        'type' => $graph['type'],
        'target' => $graph['target'],
        'name' => $graph['name'],
        'groupName' => $graph['backend']['name'],
        'resultFormats' => array_keys($graph['backend']['result_formats']),
        'examples' => $graph['examples'],
    );
}, $config['graphs']);

header('Content-Type: application/json');
print json_encode($return);
