<?php

require_once 'Log.php';
require_once 'HTTP/Request2.php';

class QueryFactory
{
    public static function create($urn)
    {
        global $config;

        $graph_config =& $config['graphs'][$urn];
        $query_class = $graph_config['backend']['query_class'];

        assert(class_exists($query_class));

        return new $query_class($urn);
    }
}

class BaseQuery 
{
    protected $request = null;
    protected $urn = null;
    protected $graph_config = null;
    protected $api_endpoint = null;

    public function getUrn()
    {
        return $this->urn;
    }
    
    public function getEndpoint()
    {
        return $this->api_endpoint;
    }

    protected function _buildRequestParameters($query, $result_format)
    {
        return array(
            'query' => $query,
            'result_format' => $result_format,
        );
    }
    
    protected function _buildRequestHeaders($query, $result_format)
    {
        return array(
            'Content-Type' => 'application/x-www-form-urlencoded'
        );
    }
    
    protected function _processResult($result, $result_format)
    {
        return $result;
    }

    protected function _rewriteQuery($query)
    {
        $return = $query;

        // Inject GRAPH <<urn>> into WHERE clause 
        // Note: This is a quite naive implementation, maybe we should
        // parse the SPARQL query!
        
        // Locate starting WHERE clause

        $match1 = null;
        preg_match('/\bWHERE[[:space:]]*{/i', $query, $match1, PREG_OFFSET_CAPTURE);
        if (empty($match1)) {
            return $return;
        }
        $off1 = $match1[0][1];
        $part1 = trim(substr($query, 0, $off1));
        
        $where_starts = $off1 + strlen($match1[0][0]) -1;
        assert(substr($query, $where_starts, 1) == '{');

        // Locate ending WHERE clause (match brackets with recursive regex)

        $match2 = null;
        preg_match('/\{(?:(?>[^\{\}]+)|(?R))*\}/', $query, $match2, PREG_OFFSET_CAPTURE, $where_starts);
        if (empty($match2)) {
            return $return;
        }
        $off2 = $match2[0][1];
        if ($off2 != $where_starts) {
            return $return; 
        }
        
        // Rewrite query

        $off3 = $where_ends = $off2 + strlen($match2[0][0]) -1;
        assert(substr($query, $where_ends, 1) == '}');

        $where_clause = trim(substr($query, $off2 +1, $off3 - $off2 -1), "\r\n");
        $part2 = trim(substr($query, $off3 +1));

        $urn = $this->urn;    
        $return = "${part1}\nWHERE {GRAPH <${urn}> {\n${where_clause}\n}}\n${part2}"; 
        return $return;
    }

    public function __construct($urn)
    {
        global $logger;
        global $config;
        
        $this->urn = $urn;
        $this->graph_config = $config['graphs'][$urn];
        
        $api_endpoint = $this->graph_config['backend']['api_endpoint'];
        $this->api_endpoint = $api_endpoint;
        $this->request = new HTTP_Request2($api_endpoint, HTTP_Request2::METHOD_POST);
        
        $logger->debug('Created a <' . get_class($this) . '> instance for ' . $this->api_endpoint);
        
        return;
    }

    public function execute($query, $result_format)
    {
        global $logger;
        
        $request =& $this->request;

        $query = $this->_rewriteQuery($query);
        
        $headers = $this->_buildRequestHeaders($query, $result_format);
        $request->setHeader($headers);

        $params = $this->_buildRequestParameters($query, $result_format);
        $request->addPostParameter($params);
        
        $logger->debug('Sending request at ' . $request->getUrl() . ' : ' . print_r($params, 1));

        $return = null;
        try {
            $response = $request->send();
            if ($response->getStatus() == 200) {
                $result = $response->getBody();
                $return = array(
                    'success' => true,
                    'result' => $this->_processResult($result, $result_format),
                    'message' => null,
                );
            } else {
                $return = array(
                    'success' => false,
                    'result' => false,
                    'message' => $response->getReasonPhrase(),
                );
            }
        } catch (HTTP_Request2_Exception $e) {
            $logger->warning('Exception at HTTP_Request2: ' . $e->getMessage());
            $return = array(
                'success' => false,    
                'result' => false,
                'message' => 'Internal Server Error', 
            );
        }

        return $return; 
    }
}

class VirtuosoQuery extends BaseQuery
{
    protected function _buildRequestParameters($query, $result_format)
    {
        $graph_config =& $this->graph_config;
        
        if (!isset($graph_config['backend']['result_formats'][$result_format])) {
            $result_format = 'application/json';
        } 

        return array(    
            'default-graph-uri' => $this->urn, 
            'query' => $query,
            'format' => $graph_config['backend']['result_formats'][$result_format],
            'timeout' => '0',
        );
    }
}

class ParliamentQuery extends BaseQuery
{
    protected function _processResult($result, $result_format)
    {
        switch ($result_format) {
        case 'text/html':
            {
                // Extract <table> subtree
                $doc = simplexml_load_string($result);
                $namespaces = $doc->getNamespaces();
                $doc->registerXPathNamespace('xhtml', $namespaces['']);
                $tab = $doc->xpath('xhtml:body//xhtml:table');
                if (is_array($tab) && !empty($tab)) {
                    $result = $tab[0]->asXML();
                } else {
                    $result = null;
                } 
            }
            break;
        default:
            break;
        }

        return $result;
    }

    protected function _buildRequestParameters($query, $result_format)
    {        
        $graph_config =& $this->graph_config;
        
        if (!isset($graph_config['backend']['result_formats'][$result_format])) {
            $result_format = 'application/json';
        }

        return array(    
            'query' => $query,
            'display' => $graph_config['backend']['result_formats'][$result_format],
            'output' => $graph_config['backend']['options']['output_types'][$result_format],
            'stylesheet' => $graph_config['backend']['options']['stylesheets'][$result_format], 
        );
    }
}

class CswMiddlewareQuery extends BaseQuery
{ 
    protected function _rewriteQuery($query)
    {
        // do not rewrite
        return $query;
    }
    
    protected function _buildRequestParameters($query, $result_format)
    {
        $graph_config =& $this->graph_config;
        
        if (!isset($graph_config['backend']['result_formats'][$result_format])) {
            $result_format = 'application/rdf+xml';
        }
       
        return array(
            'query' => $query,
            'format' => $graph_config['backend']['result_formats'][$result_format],
        );
    }
}

