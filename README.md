# sparql-endpoint


A SPARQL proxy endpoint developed under GeoKnow project

## Requirements

This is a plain PHP application, wrapping several SPARQL endpoints under a uniform interface.

Before deploying under a web server, install `Pear` package manager and the following packages:

 * `Log`
 * `HTTP_Request2`

For example, in a debian 7.x web server, the above can be accomplished as:

    apt-get install php5 php-pear
    pear install Log
    pear install HTTP_Request2

Create a directory to store application logs (remember to protect it from being served from the web server!):

    mkdir log
    chmod 0775 log
    sudo chown user:www-data log # Make it writable for the web server

If running under Apache2, you can protect it with the following stanza (assuming the application was checked-out at `/home/user/var/www/sparql-endpoint/`):


```
<Directory /home/user/var/www/sparql-endpoint/log>
    AllowOverride None
    Order allow,deny
</Directory>
```
