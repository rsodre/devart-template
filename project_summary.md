# Cartograffiti

## Author
- Roger Sodré, [github.com/rsodre](https://github.com/rsodre), [@Roger_S](http://www.twitter.com/Roger_S)

## Description
CartoGraffiti is a **collaborative painting** web application, using the Earth surface as it's canvas.

Pick up a location from **Google Maps** and make your art, with **brush**, **stencils** and **stickers**.

Once drawn, It will stay there, composing a **virtual art gallery** that anyone can see and extend.

My intention is to deliver a tool and see what people will create with it!

## Prototype
[cartograffiti.net](http://cartograffiti.net/)

## Example Code

Sample from the client, made with Processing.js (Javascript)

```
function get_cg_tile_url( zoom, x, y, level ) {
	url = domain_tiles+"/static/tiles/"+zoom+"/"+x+"/"+y+"/tile";
	for (var i = 1 ; i < level ; i++)
		url += "_";
	url += ".png";
	return url;
}
```

Sample from the server, made with Django (Python)

```
def tile(request, zoom, x, y):
	# Exist?
	path = get_local_tile_path( request, zoom, x, y, 1 )
	if ( not os.path.exists( path ) ):
		return HttpResponseNotFound()
	# Send static link
	path = get_tile_path( request, zoom, x, y )
	return HttpResponseRedirect( path )
```
## External Libraries

- [Google Maps API](http://code.google.com/apis/maps/)
- [Processing.js](http://processingjs.org/)
- [jQuery](http://jquery.com/)
- [Django](http://www.djangoproject.com/)
- [PostgreSQL](http://www.postgresql.org/)
- [PostGIS](http://postgis.refractions.net/)
- [GDAL](http://www.kyngchaos.com/software/frameworks#gdal_complete)
- [PhoneGap](http://phonegap.com/)

## Images & Videos

Getting a hang on tiles...
![wip 1](project_images/wip1.jpg?raw=true "wip 1")

Already sticking!
![wip 2](project_images/wip2.jpg?raw=true "wip 2")

