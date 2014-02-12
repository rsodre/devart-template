
// push object to the end
function _obj_push(obj, o)
{
	var i = _obj_length(obj);
	_obj_set(obj, i, o);
	return i;
}

// set object i
function _obj_set(obj, i, o)
{
	obj[i] = $.extend(o, {i:i});
}

// get object i
function _obj_get(obj, i)
{
	for (var id in obj)
		if (id == i)
			return obj[id];
	return null;
}

// remove an object
// shift back all the others
function _obj_rm(obj, i)
{
	if (i < 0 || i >= _obj_length(obj))
		return;
	for (id in obj)
		if (id > i)
			_obj_set(obj, id-1, obj[id]);
	// delete last
	delete obj[_obj_length(obj)-1];
}

// get object length
function _obj_length(obj)
{
	var i = 0;
	for (id in obj)
		i++;
	return i;
}

// clear all objects
function _obj_clear(obj)
{
	for (id in obj)
	{
		obj[id] = null;
		delete obj[id];
	}
	obj = null;
}




/* GOOGLE MAPS DISABLED

// === A method for testing if a point is inside a polygon
// === Returns true if poly contains point
// === Algorithm shamelessly stolen from http://alienryderflex.com/polygon/ 
google.maps.Polygon.prototype.Contains = function(point) {
	var j=0;
	var oddNodes = false;
	var x = point.lng();
	var y = point.lat();
	var vertexCount = this.getPath().getLength();
	for (var i=0; i < vertexCount; i++) {
		var vi = this.getPath().getAt(i);
		j++;
		if (j == vertexCount) {j = 0;}
		var vj = this.getPath().getAt(j);
		if (((vi.lat() < y) && (vj.lat() >= y))
			|| ((vj.lat() < y) && (vi.lat() >= y))) {
            if ( vi.lng() + (y - vi.lat())
				/  (vj.lat()-vi.lat())
				*  (vj.lng() - vi.lng())<x ) {
				oddNodes = !oddNodes
            }
		}
	}
	return oddNodes;
}

// === A method for testing if a point is inside a polyline
// === Add the GPolygon method to GPolyline
google.maps.Polyline.prototype.Contains = google.maps.Polygon.prototype.Contains;

*/
