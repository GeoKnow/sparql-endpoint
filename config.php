<?php

$config['logfile'] = 'log/error.log';

$config['result_formats'] = array(
    'application/json' => array(
        'extension' => 'json',
    ),
    'text/html' => array(
        'extension' => 'html',
    ),
    'text/csv' => array(
        'extension' => 'csv',
    ),
    'application/vnd.ms-excel' => array(
        'extension' => 'xls',
    ),
    'application/xml' => array(
        'extension' => 'xml',
    ),
    'text/plain' => array(
        'extension' => 'txt',
    ),
    'application/rdf+xml' => array(
        'extension' => 'rdf',
    ), 
    'application/sparql-results+xml' => array(
        'extension' => 'srx',
    ), 
    'text/tab-separated-values' => array(
        'extension' => 'tsv',
    ), 
);

$config['limits'] = array(
    'result_size' => 100, /* unused for now */
    'query_length' => 4096,
);

$config['defaults'] = array(
    'graph_uri' => 'urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire',
    'result_format' => 'application/json',
);

//
// Backend Configuration
//

$config['backends'] = array();

$config['backends']['virtuoso'] = array(
    'type' => 'virtuoso',
    'name' => 'Virtuoso',
    'query_class' => 'VirtuosoQuery',
    'api_endpoint' => 'http://geoknow-server.imis.athena-innovation.gr:11480/sparql',
    'result_formats' => array(
        'application/json' => 'application/json',
        'text/html' => 'text/html',
        'text/csv' => 'text/csv',
        'application/vnd.ms-excel' => 'application/vnd.ms-excel',
        'application/xml' => 'application/xml',
        'text/plain' => 'text/plain',
        'application/rdf+xml' => 'application/rdf+xml',
        'text/tab-separated-values' => 'text/tab-separated-values',
    ),
    'options' => array(),
);

$config['backends']['parliament'] = array(
    'type' => 'parliament',
    'name' => 'Parliament',
    'query_class' => 'ParliamentQuery',
    'api_endpoint' => 'http://geoknow-server.imis.athena-innovation.gr:11880/parliament/sparql',
    'result_formats' => array(
        'application/json' => 'json',
        'text/html' => 'html',
        'application/sparql-results+xml' => 'xml',
        'text/csv' => 'csv',
    ),
    'options' => array(
        'output_types' => array(
            'application/json' => 'json',
            'text/html' => '',
            'application/sparql-results+xml' => '',
            'text/csv' => '',
        ),
        'stylesheets' => array(
            'application/json' => '',
            'text/html' => '/xml-to-html.xsl',
            'application/sparql-results+xml' => '',
            'text/csv' => '/xml-to-csv.xsl',
        ),
    ),
);

$config['backends']['csw-middleware'] = array(
    'type' => 'csw-middleware',
    'name' => 'CSW-to-RDF Middleware', 
    'query_class' => 'CswMiddlewareQuery',
    'api_endpoint' => 'http://localhost:5001/sparql',
    'result_formats' => array(
        'application/rdf+xml' => 'application/rdf+xml',
    ),
    'options' => array(),
);

//
// Graph Configuration
//

$config['graphs']['urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire'] = array(
    'type' => 'virtuoso',
    'backend' => $config['backends']['virtuoso'],
    'name' => 'Virtuoso - INSPIRE Metadata',
    'target' => 'metadata',
    'examples' => array(
        'q0' => array(
            'file' => 'q0.sparql',
            'description' => 'Count all stored triples for metadata (including blank nodes!)',
        ),
        'q1' => array(
            'file' => 'q1.sparql',
            'description' => 'Show all keywords available in the metadata',
        ),        
        'q2' => array(
            'file' => 'q2.sparql',
            'description' => 'Report when the latest update of each dataset did actually occur (after 2011)',
        ),
        'q3' => array(
            'file' => 'q3.sparql',
            'description' => 'Display providers for each dataset',
        ),
        'q4' => array(
            'file' => 'q4.sparql',
            'description' => 'Find any available datasets with metadata that contain a given keyword',
        ),
        'q5' => array(
            'file' => 'q5.sparql',
            'description' => 'Identify datasets with total spatial extent (MBB) ovelapping the given area of interest (a rectangle)',
        ),
        'q6' => array(
            'file' => 'q6.sparql',
            'description' => 'Get details for all available datasets',
        ),
    ),
);

$config['graphs']['urn:x-geoknow-eu:sparql:virtuoso:data:inspire'] = array(
    'type' => 'virtuoso',
    'backend' => $config['backends']['virtuoso'],
    'name' => 'Virtuoso - INSPIRE Data',
    'target' => 'data', 
    'examples' => array(
        'q0' => array(
            'file' => 'q0.sparql',
            'description' => 'Count all stored triples in the graph (including those with blank nodes!)',
        ),
        'q1' => array(
            'file' => 'q1.sparql',
            'description' => 'Which administrative unit (AU) is at the specified geographic location',
        ),
        'q2' => array(
            'file' => 'q2.sparql',
            'description' => 'Find protected sites (PS) within a distance of 20 km from the given location',
        ),
        'q3' => array(
            'file' => 'q3.sparql',
            'description' => 'Identify the administrative unit (AU) where each protected site (PS) belongs to',
        ),
        'q4' => array(
            'file' => 'q4.sparql',
            'description' => 'Find settlements (GN) that are contained within the given administrative unit (AU)',
        ),
        'q5' => array(
            'file' => 'q5.sparql',
            'description' => 'Retrieve all cadastral parcels (CP) of area greater than 20000 sq.m.',
        ),
        'q6' => array(
            'file' => 'q6.sparql',
            'description' => 'Find all road names (TN) in lexicographical order',
        ),
        'q7' => array(
            'file' => 'q7.sparql',
            'description' => 'Identify waterstreams (HY) of length longer than 30km',
        ),
        'q8' => array(
            'file' => 'q8.sparql',
            'description' => 'Find rivers (HY) that intersect with protected sites (PS)',
        ),
        'q9' => array(
            'file' => 'q9.sparql',
            'description' => 'Identify all addresses (AD) that refer to a particular road',
        ),
        'q10' => array(
            'file' => 'q10.sparql',
            'description' => 'Report addresses (AD) within 2km from the given location',
        ),
    ),
);

$config['graphs']['urn:x-geoknow-eu:sparql:parliament:metadata:inspire'] = array(
    'type' => 'parliament',
    'backend' => $config['backends']['parliament'],
    'name' => 'Parliament - INSPIRE Metadata',
    'target' => 'metadata',
    'examples' => array(        
        'q0' => array(
            'file' => 'q0.sparql',
            'description' => 'Count all stored triples for metadata (including blank nodes!)',
        ),
        'q1' => array(
            'file' => 'q1.sparql',
            'description' => 'Show all keywords available in the metadata',
        ),
        'q2' => array(
            'file' => 'q2.sparql',
            'description' => 'Report when the latest update of each dataset did actually occur (after 2011)',
        ),
        'q3' => array(
            'file' => 'q3.sparql',
            'description' => 'Display providers for each dataset',
        ),
        'q4' => array(
            'file' => 'q4.sparql',
            'description' => 'Find any available datasets with metadata that contain a given keyword',
        ),
        'q5' => array(
            'file' => 'q5.sparql',
            'description' => 'Identify datasets with total spatial extent (MBB) ovelapping the given area of interest (a rectangle)',
        ),
        'q6' => array(
            'file' => 'q6.sparql',
            'description' => 'Get details for all available datasets',
        ),
    ),
);

$config['graphs']['urn:x-geoknow-eu:sparql:parliament:data:inspire'] = array(
    'type' => 'parliament',
    'backend' => $config['backends']['parliament'],
    'name' => 'Parliament - INSPIRE Data',
    'target' => 'data',
    'examples' => array(
        'q0' => array(
            'file' => 'q0.sparql',
            'description' => 'Count all stored triples in the graph (including those with blank nodes!)',
        ),
        'q1' => array(
            'file' => 'q1.sparql',
            'description' => 'Which administrative unit (AU) is at the specified geographic location',
        ),
        'q2' => array(
            'file' => 'q2.sparql',
            'description' => 'Find protected sites (PS) within a distance of 20 km from the given location',
        ),
        'q3' => array(
            'file' => 'q3.sparql',
            'description' => 'Identify the administrative unit (AU) where each protected site (PS) belongs to',
        ),
        'q4' => array(
            'file' => 'q4.sparql',
            'description' => 'Find settlements (GN) that are contained within the given administrative unit (AU)',
        ),
        'q5' => array(
            'file' => 'q5.sparql',
            'description' => 'Retrieve all cadastral parcels (CP) of area greater than 20000 sq.m.',
        ),
        'q6' => array(
            'file' => 'q6.sparql',
            'description' => 'Find all road names (TN) in lexicographical order',
        ),
        'q7' => array(
            'file' => 'q7.sparql',
            'description' => 'Identify waterstreams (HY) of length longer than 30km',
        ),
        'q8' => array(
            'file' => 'q8.sparql',
            'description' => 'Find rivers (HY) that intersect with protected sites (PS)',
        ),
        'q9' => array(
            'file' => 'q9.sparql',
            'description' => 'Identify all addresses (AD) that refer to a particular road',
        ),
        'q10' => array(
            'file' => 'q10.sparql',
            'description' => 'Report addresses (AD) within 2km from the given location',
        ),
    ),
);

$config['graphs']['urn:x-geoknow-eu:sparql:csw-middleware'] = array(
    'type' => 'csw-middleware',
    'backend' => $config['backends']['csw-middleware'],
    'name' => 'A collection of INSPIRE CSW catalogues',
    'target' => 'metadata',
    'examples' => array(
        'q0' => array(
            'file' => 'q0.sparql',
            'description' => 'Find records tagged with a given keyword',
        ),
        'q1' => array(
            'file' => 'q1.sparql',
            'description' => 'Find datasets that specify the given subject in their metadata',
        ),
        'q2' => array(
            'file' => 'q2.sparql',
            'description' => 'Find datasets with spatial coverage inside a given rectangle (BBOX)',
        ),
        'q3' => array(
            'file' => 'q3.sparql',
            'description' => 'Identify datasets that specify the given title and subject',
        ),
        'q4' => array(
            'file' => 'q4.sparql',
            'description' => 'Find datasets within a given rectangle (BBOX), with also a keyword and a title',
        ),
        'q5' => array(
            'file' => 'q5.sparql',
            'description' => 'Find datasets on multiple subjects',
        ),
    ),
);

