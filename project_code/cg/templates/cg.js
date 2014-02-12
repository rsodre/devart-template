//
// debug=[{{debug}}] localhost=[{{localhost}}] page=[{{page}}]
//
// CONSTANTS
//
{% if localhost %}
var domain = "http://127.0.0.1:8000";
var domain_share = "http://127.0.0.1:8000";
var domain_tiles = "http://127.0.0.1:8000";
{% else %}
var domain = "http://www.cartograffiti.net";
var domain_share = "http://www.cartograffiti.net";
var domain_tiles = "http://tiles.cartograffiti.net";
{% endif %}
var TAB_BRUSH	= 0;
var TAB_STENCIL = 1;
var TAB_STICKER = 2;
//
// GLOBALS
//
// Processing
var pro = null;				// PROCESSING INSTANCE
var pro_stencil = null;		// PROCESSING INSTANCE
var pro_brush = null;		// PROCESSING INSTANCE
var pro_picker = null;		// PROCESSING INSTANCE
// Google Maos
var map = null;				// MAPS INSTANCE
var projection = null;		// MAPS PROJECTION
var maxZoomService = null;
// Default values
var min_zoom = 2;
var max_zoom = 20;
var tile_size = {{globals.tile_size}};
var tile_levels = {{globals.tile_levels}};	// how many layers are displayed
var MAP_LAYER_CG_PLUS1 = 0;
var MAP_LAYER_CG = 1;
var MAP_LAYER_GRID = 2;
var MAP_LAYER_PROGRESS = 3;
var tab_content_visible_height = 0;
var tab_content_height = {{style.tabContentHeight}};
// Current state
var current_map_type = google.maps.MapTypeId.HYBRID
var current_tab = TAB_STICKER;
var window_width = 0;
var window_height = 0;
var map_width = 0;
var map_height = 0;
var current_zoom = {%if zoom%}{{zoom}}{%else%}min_zoom{%endif%};
var current_center = new google.maps.LatLng( {%if lat%}{{lat}}{%else%}0{%endif%}, {%if lng%}{{lng}}{%else%}0{%endif%} );
var center_world = null;
var center_pixel = null;
var center_tile = null;
var mouse_pixel = null;
var mouse_tile = null;
var map_pixel_nw = null;	// Current MAPS Bounds NE (pixel coordinates)
var map_pixel_se = null;	// Current MAPS Bounds SW (pixel coordinates)
var map_tile_nw = null;		// Current MAPS Bounds NE (tile coordinates)
var map_tile_se = null;		// Current MAPS Bounds SW (tile coordinates)
// state
var cg_opacity = 1.0;
var isPainting = false;
var isStenciling = false;
var isSticking = false;
var drawCoords = false;
var draw_grid = {%if debug%}false{%else%}false{%endif%}
var tileObjects = {};		// Dimensoes de cada tile para sync com processing


//////////////////////////////////////
//
// MAPS OVERLAY
// http://code.google.com/apis/maps/documentation/javascript/maptypes.html#CustomMapTypes
//
// CG Image Layer
function MapTypeCGTiles() {
	this.tileSize = new google.maps.Size( tile_size, tile_size );
}
MapTypeCGTiles.prototype.getTile = function(coord, zoom, ownerDocument) {
	var div = ownerDocument.createElement('DIV');
	div.style.width = this.tileSize.width + 'px';
	div.style.height = this.tileSize.height + 'px';
	div.style.opacity = cg_opacity;
	div.id = "cgdiv";
	div.innerHTML = "";
	norm = getNormalizedTiles( zoom, coord.x, coord.y );
	if (norm)
	{
		var tile_url = get_cg_tile_url( zoom, norm.x, norm.y, 1 );
		var tile_id = get_img_div_name( zoom, coord.x, coord.y );
		div.innerHTML = "<img id='"+tile_id+"' src='"+tile_url+"' style='display:none;' onLoad=\"this.style.display='inline';\">";
	}
	return div;
};
function get_cg_tile_url( zoom, x, y, level ) {
	//var millis = new Date().getTime();
	//return "/tile/"+zoom+"/"+x+"/"+y+"/";
	url = domain_tiles+"/static/tiles/"+zoom+"/"+x+"/"+y+"/tile";
	for (var i = 1 ; i < level ; i++)
		url += "_";
	url += ".png";
	return url;
}
//
// CG Image Layer
// ZOOM+1
function MapTypeCGTilesPlus1() {
	this.tileSize = new google.maps.Size( tile_size/2, tile_size/2 );
}
MapTypeCGTilesPlus1.prototype.getTile = function(coord, zoom, ownerDocument) {
	if (zoom >= max_zoom)
		return null;
	var div = ownerDocument.createElement('DIV');
	div.style.width = this.tileSize.width + 'px';
	div.style.height = this.tileSize.height + 'px';
	div.style.opacity = cg_opacity;
	div.id = "cgdiv";
	div.innerHTML = "x";
	norm = getNormalizedTiles( zoom+1, coord.x, coord.y );
	if (norm)
	{
		var tile_url = get_cg_tile_url( zoom+1, norm.x, norm.y, 2 );
		var tile_id = get_img_div_name(zoom+1,coord.x,coord.y);
		div.innerHTML = "<img id='"+tile_id+"' src='"+tile_url+"' style='display:none;' onLoad=\"this.style.display='inline';\">";
	}
	return div;
};
//
// CG Progress layer
function MapTypeCGProgress() {
	this.tileSize = new google.maps.Size( tile_size, tile_size );
}
MapTypeCGProgress.prototype.getTile = function(coord, zoom, ownerDocument) {
	// Make tile div
	var div = ownerDocument.createElement('DIV');
	div.id = get_prog_div_name(zoom, coord.x, coord.y);
	div.style.width = this.tileSize.width + 'px';
	div.style.height = this.tileSize.height + 'px';
	div.style.backgroundColor = '#ffffff';
	div.style.opacity = '0.33';
	div.style.display = 'none';
	div.innerHTML = "";
	return div;
};
function get_img_div_name(z, x, y)
{
	return "cg_"+z+"_"+x+"_"+y;
}
function get_prog_div_name(z, x, y)
{
	return "prog_"+z+"_"+x+"_"+y;
}
// set prog overlay size
function set_prog_div_prog(z, x, y, prog, color, msg)
{
	var d = $("#"+get_prog_div_name(z, x, y));
	if (prog <= 0.0)
		d.fadeOut();
	else
	{
		//var sz = (tile_size*prog);
		//d.css('height',sz);
		if (color != undefined)
			d.css('background-color',color);
		if (msg != undefined)
			d.html("<text class='text_progress'>"+msg+"</text>");
		else
			d.html("");
		d.fadeIn();
	}
}
// set prog overlay size
function refresh_tile(z, x, y, prog)
{
	var millis = new Date().getTime();
	var img = $("#"+get_img_div_name(z, x, y));
	var src = img.attr('src');
	var pos = src.indexOf('?');
	if ( pos >= 0)
		src = src.substr(0,pos);
	src += "?"+millis;
	img.attr('src', src);
	img.attr('onLoad', "set_prog_div_prog("+z+","+x+","+y+",0.0);this.style.display='inline';");
	//alert("refresh "+z+"/"+x+"/"+y+" img="+img);
}
//
// CG Info layer
function MapTypeCGGrid() {
	this.tileSize = new google.maps.Size( tile_size, tile_size );
}
MapTypeCGGrid.prototype.getTile = function(coord, zoom, ownerDocument) {
	// normalize
	norm = getNormalizedTiles( zoom, coord.x, coord.y );
	if (norm ==null)
		return null;
	// Make tile div
	var div = ownerDocument.createElement('DIV');
	div.style.width = eval(this.tileSize.width+1) + 'px';
	div.style.height = eval(this.tileSize.height+1) + 'px';
	div.style.fontSize = '10';
	div.style.borderColor = '#888888';
	div.style.borderStyle = 'solid';
	div.style.borderWidth = '1px';
	div.innerHTML = "&nbsp;" + zoom + ": (" + norm.x + "," + norm.y + ")";
	return div;
};
//
// Get share link
function get_sharing_link()
{
	return domain_share+"/"+current_zoom+"/"+current_center.lat()+"/"+current_center.lng()+"/";
}


//////////////////////////////////////
//
// INITIALIZE
//
function initialize()
{
{% if android %}
	// Wait for phonegap to initialize
	document.addEventListener("deviceready", __initialize, true);
}
var __initialize = function()
{
{% endif %}
	//
	// Init map
	var myOptions =
	{
		mapTypeId: 			google.maps.MapTypeId.SATELLITE,
		backgroundColor:	"{{style.colorBack}}",
		draggable:			true,
		streetViewControl:	false,
		center:				current_center,
		zoom:				current_zoom,
		minZoom:			min_zoom,
		maxZoom:			max_zoom,
		mapTypeControlOptions: {
			mapTypeIds: ['cg']
		}
	};
	map = new google.maps.Map(document.getElementById("map_div"), myOptions);
	// Events
	google.maps.event.addListener(map, 'bounds_changed', function(){
								  map_bounds_changed();
								  });
	google.maps.event.addListener(map, 'mouseover', function(event){
								  get_mouse_map( event );
								  });
	google.maps.event.addListener(map, 'mousemove', function(event){
								  get_mouse_map( event );
								  });
	// Max zoom lock
	maxZoomService = new google.maps.MaxZoomService();
	google.maps.event.addListener(map, 'zoom_changed', function(event) {
		maxZoomService.getMaxZoomAtLatLng(map.getCenter(), function(response) {
			if (response.status === google.maps.MaxZoomStatus.OK)
			{
				current_zoom = map.getZoom();
				//alert("ZOOM "+current_zoom+ " max="+response.zoom);
				if (current_zoom > response.zoom)
					map.setZoom(response.zoom);
			}
			});
		});
	
	// CG Overlay
	// Insert this overlay map type as the first overlay map type at position 0.
	//if (tile_levels >= 2)
	//	map.overlayMapTypes.setAt( MAP_LAYER_CG_PLUS1, new MapTypeCGTilesPlus1() );
	map.overlayMapTypes.setAt( MAP_LAYER_CG, new MapTypeCGTiles() );
	map.overlayMapTypes.setAt( MAP_LAYER_PROGRESS, new MapTypeCGProgress() );
	switch_grid( draw_grid );
	switch_labels( current_map_type );

	//
	// Window resize EVENT
	$(window).bind("resize", function(){
		__resize_window_event();
	});
	// first time resize!
	goto_brush();
	__resize_window_event();
	$('#col_left').show();
	$('#col_right').show();
	
	// Facebook link
	// http://developers.facebook.com/docs/guides/web/
	// http://developers.facebook.com/docs/reference/plugins/like/
	var url_face = "http://www.facebook.com/plugins/like.php?layout=button_count&href=YOUR_URL"+escape("{{url_facebook}}");
	$('#facebook_like').attr('src',url_face);
	
	// wait processing to initialize
	setTimeout("__initialize_processing();", 2000);
}
//
// Get Processing instance
function __initialize_processing()
{
	pro = Processing.getInstanceById('processing_canvas');
{% if page == 'paint' %}
	pro_stencil = Processing.getInstanceById('processing_stencil');
	pro_brush = Processing.getInstanceById('processing_brush');
	pro_picker = Processing.getInstanceById('processing_picker');
	$("#ui_slider_brush_size").slider('value', pro.get_BRUSH_SIZE() );
{% endif %}
	// Resize to map
	resize_processing();
	// Update GUI
	// finito 
	pro.set_DEBUG( {%if debug%}true{%else%}false{%endif%} );
	pro.set_INITIALIZED( true );
	// Turn off Processing canvas
	goto_maps();
	//alert("pro=["+pro+"] wh=["+pro.get_WIDTH()+"/"+pro.get_HEIGHT()+"]");
	
	// update shares
{% if page == 'shares' %}
	shares_refresh_schedule();
{% endif %}
}
//
// RESIZE MAP (window event)
function __resize_window_event()
{
	// Avoid wrong resize
	if ( window_width == window.innerWidth && window_height == window.innerHeight )
		return;
	window_width = window.innerWidth;
	window_height = window.innerHeight;
	// Resize mapview
	var wl = ( $('#col_left') ? $('#col_left').width() : 0 );
	var wr = ( $('#col_right') ? $('#col_right').width() : 0 );
	var w = window.innerWidth - wl - wr;
	$('#col_middle').css('left', wl );
	$('#col_middle').width( w );
	$('#col_middle').height( window.innerHeight );
	$('#col_left').height( window.innerHeight );
	$('#col_right').height( window.innerHeight );
	// Resize Processing
	resize_processing();
	//
	// TABS
	// Minus 5 buttons: Save, Discard, Brush, Stencil, Sticker
	var tab_total_height = window.innerHeight - ({{style.buttonHeight}}*(5-1));
	// Resize tabs by CLASS
	tab_content_visible_height = tab_total_height - {{style.buttonHeight}};
	$('.tab_tab').height( tab_total_height );
	$('.tab_content').height( tab_content_visible_height );
	// resize scrolls
	$('#tab_content_brush').scrollbar();
	//$('#tab_content_stencil').scrollbar();
	//$('#tab_content_sticker').scrollbar();
	// Re-position tabs (stopping animation)
	$('#tab_stencil').stop().css( 'top', {{style.tabStencilY}} + (current_tab<TAB_STENCIL ? tab_content_visible_height : 0) );
	$('#tab_sticker').stop().css( 'top', {{style.tabStickerY}} + (current_tab<TAB_STICKER ? tab_content_visible_height : 0) );
	__print_console("RESIZE WINDOW "+window.innerWidth+" "+window.innerHeight);
}
function resize_processing()
{
	var w = $('#map_div').width();
	var h = $('#map_div').height();
	var left = $('#map_div').css('left');
	if (pro)
		pro.resize( w, h );
	if (pro_stencil)
		pro_stencil.resize( w, h );
	$('#processing_canvas').css('left', left );
	$('#processing_stencil').css('left', left );
	//alert("resize map "+$('#map_div').width()+" "+$('#map_div').height()+" pro"+pro.get_WIDTH()+" "+pro.get_HEIGHT()+"");
}
//
// Pront to console
function __print_console( txt )
{
{% if debug %}
	$("#text_console").html( txt );
{% endif %}
}
//
// GPS Error
function __gps_error(error)
{
	if (error.code == 1)
		//alert('GPS inacessível.');
		alert('GPS unreachable.');
	else if (error.code == 2)
		//alert('GPS indisponível.');
		alert('GPS unavailable.');
	else if (error.code == 3)
		//alert('GPS não responde.');
		alert('GPS do not respond.');
	else
		alert('GPS error '+error.code+' / '+error.message);
}

// update shares
{% if page == 'shares' %}
function shares_refresh_schedule()
{
	setTimeout( "shares_refresh_now();", {{globals.shares_refresh_rate}}*1000 );
}
function shares_refresh_now()
{
	var url = "/refresh_shares/";
	$.post(url, {}, function (data) {
		   // parse data
		   var obj = jQuery.parseJSON(data);
		   if (obj)
		   {
				if (obj.zoom && obj.lat && obj.lng )
				{
					map.setCenter( new google.maps.LatLng( obj.lat, obj.lng ) );
					map.setZoom( obj.zoom );
				}
		   }
		   // NEXT!
		   shares_refresh_schedule();
	} );
}
{% endif %}


////////////////////////////////////////////////////
//
// MAPS STUFF
//
// from: http://code.google.com/apis/maps/documentation/javascript/examples/maptype-image.html
// Normalizes the coords that tiles repeat across the x axis (horizontally)
// like the standard Google map tiles.
function getNormalizedTiles( zoom, x, y ) {
	// tile range in one direction range is dependent on zoom level
	// 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
	tileRange = get_tile_range( zoom );
	// don't repeat across y-axis (vertically)
	if (y < 0 || y >= tileRange)
		return null;
	// repeat across x-axis
	if (x < 0 || x >= tileRange)
		x = (x % tileRange + tileRange) % tileRange;
	// Return maps Point
	return new google.maps.Point( x, y );
}
function get_tile_range( z )
{
	return  (1 << z) * (256 / tile_size);
}
function get_mouse_map( event )
{
	if (drawCoords)
	{
		if (projection == null)
			projection = map.getProjection();
		var mouse_latlng = event.latLng;
		var mouse_world = projection.fromLatLngToPoint( event.latLng );
		mouse_pixel = world_to_pixel( mouse_world, current_zoom);
		mouse_tile = pixel_to_tile( mouse_pixel.x, mouse_pixel.y );
	}
}
function map_bounds_changed()
{
	if (projection == null)
		projection = map.getProjection();
	current_zoom = map.getZoom();
	$('#text_zoom_level').html( "<br>LAYER:<br>"+current_zoom );
	//
	// Get Center
	current_center = map.getCenter();
	center_world = projection.fromLatLngToPoint( current_center );
    center_pixel = world_to_pixel( center_world, current_zoom);
	center_tile = pixel_to_tile( center_pixel.x, center_pixel.y );
	//
	// Get Bounds
	// map.getBounds() returns bad longitude!
	map_width = $('#map_div').width();
	map_height = $('#map_div').height();
    map_pixel_nw = new google.maps.Point( Math.floor(center_pixel.x - (map_width/2)), Math.floor(center_pixel.y - (map_height/2)) );
    map_pixel_se = new google.maps.Point( Math.floor(center_pixel.x + (map_width/2)), Math.floor(center_pixel.y + (map_height/2)) );
	map_tile_nw = pixel_to_tile( map_pixel_nw.x, map_pixel_nw.y );
	map_tile_se = pixel_to_tile( map_pixel_se.x, map_pixel_se.y );
	map_tile_width = (map_tile_se.x - map_tile_nw.x + 1);
	map_tile_height = (map_tile_se.y - map_tile_nw.y + 1);
	//__print_console("RESIZE MAP "+map_width+" "+map_height);
}
function world_to_pixel( w, z )
{
	return new google.maps.Point( Math.round(w.x * Math.pow(2, z)), Math.round(w.y * Math.pow(2, z)) );
}
function pixel_to_world( p, z )
{
	return new google.maps.Point( p.x / Math.pow(2, z), p.y / Math.pow(2, z) );
}
function pixel_to_tile( x, y )
{
	return new google.maps.Point(Math.floor(x / tile_size), Math.floor(y / tile_size));
}
//
// Make pixel tiles for the current map
function make_map_grid()
{
	_obj_clear(tileObjects);
	var tileRange = get_tile_range( current_zoom );
	var gap_x = Math.abs( map_pixel_nw.x % tile_size );
	if (map_pixel_nw.x >= 0)
		gap_x = tile_size - gap_x;
	var gap_y = Math.abs( map_pixel_nw.y % tile_size );
	if (map_pixel_nw.y >= 0)
		gap_y = tile_size - gap_y;
	for (var tx = 0 ; tx < map_tile_width ; tx++)
	{
		for (var ty = 0 ; ty < map_tile_height ; ty++)
		{
			// Source: Processing coords
			var sx = ( tx == 0 ? 0 : (gap_x + ((tx-1) * tile_size)) );
			var sy = ( ty == 0 ? 0 : (gap_y + ((ty-1) * tile_size)) );
			// Dest: tile coords
			var dx = ( tx == 0 ? (tile_size-gap_x) : 0 );
			var dy = ( ty == 0 ? (tile_size-gap_y) : 0 );
			// chunk size (not tile size!)
			var w = ( tx == 0 ? gap_x : ( tx == map_tile_width-1 ? map_width-sx : tile_size ) );
			var h = ( ty == 0 ? gap_y : ( ty == map_tile_height-1 ? map_height-sy : tile_size ) );
			// maps pixel coords
			var map_x = (sx + map_pixel_nw.x);
			var map_y = (sy + map_pixel_nw.y);
			// maps tile
			var tile = pixel_to_tile( map_x, map_y );
			// make object
			var o = {
				zoom:		current_zoom,
				tile_x:		tile.x,
				tile_y:		tile.y,
				sx:			sx,
				sy:			sy,
				dx:			dx,
				dy:			dy,
				w:			w,
				h:			h,
			}
			if (tile.y >= 0 && tile.y < tileRange)
				_obj_push(tileObjects, o);
			//alert("tx="+tx+" ty="+ty+" sx="+o.sx+" sy="+o.sy+" w="+o.w+" h="+o.h);
		}
	}
}




////////////////////////////////////////////////////
//
// ACTIONS
//
function goto_maps()
{
	map.setOptions( { mapTypeId: current_map_type } );
	isPainting = isStenciling = isSticking = false;
	$('#processing_stencil').hide();
	$('#processing_canvas').hide();
{% if page == 'paint' %}
	pro_stencil.reset();
{% endif %}
	__button_disable( $('#button_save') );
	__button_disable( $('#button_discard') );
	__button_enable( $('#button_draw') );
	__button_enable( $('#button_labels') );
	switch_labels( current_map_type );
}
function goto_painter()
{
	map.setOptions( { mapTypeId: google.maps.MapTypeId.SATELLITE } );
	isPainting = true;
	isSticking = false;
	make_map_grid();
	pro.reset_canvas();
	$('#processing_canvas').show();
	$('#processing_canvas').fadeTo(0, cg_opacity);
	if (isStenciling)
	{
		$('#processing_stencil').show();
		$('#processing_stencil').fadeTo(0, cg_opacity);
		pro_stencil.set_EDITING( false );
	}
	else
		$('#processing_stencil').hide();
	__button_enable( $('#button_save') );
	__button_enable( $('#button_discard') );
	__button_disable( $('#button_draw') );
	__button_disable( $('#button_labels') );
}
//
// Button style
function __button_on( butt )
{
	butt.css('font-weight','bold');
	if (butt.html()) butt.html( butt.html().toUpperCase() );
}
function __button_off( butt )
{
	butt.css('font-weight','normal');
	if(butt.html()) butt.html( butt.html().toLowerCase() );
}
function __button_enable( butt )
{
	__button_on( butt );
	butt.attr("disabled", false);
	// TODO:: remover borda do button:hover
	//butt.css('border-width','2px');
}
function __button_disable( butt )
{
	__button_off( butt );
	butt.attr("disabled", true);
	//butt.css('border-width','1px');
}
//
// Open stencil layer
// If STICKER, enable SAVE
// If Stencil, enable DRAW
function goto_brush()
{
	current_tab = TAB_BRUSH;
	__button_on( $('#button_tab_brush') );
	__button_off( $('#button_tab_stencil') );
	__button_off( $('#button_tab_sticker') );
	$('#tab_stencil').animate( { 'top': {{style.tabStencilY}}+tab_content_visible_height }, 300 );
	$('#tab_sticker').animate( { 'top': {{style.tabStickerY}}+tab_content_visible_height }, 300 );
}
function goto_stencil()
{
	current_tab = TAB_STENCIL;
	__button_off( $('#button_tab_brush') );
	__button_on( $('#button_tab_stencil') );
	__button_off( $('#button_tab_sticker') );
	$('#tab_stencil').animate( { 'top': {{style.tabStencilY}} }, 300 );
	$('#tab_sticker').animate( { 'top': {{style.tabStickerY}}+tab_content_visible_height }, 300 );
}
function goto_sticker()
{
	current_tab = TAB_STICKER;
	__button_off( $('#button_tab_brush') );
	__button_off( $('#button_tab_stencil') );
	__button_on( $('#button_tab_sticker') );
	$('#tab_stencil').animate( { 'top': {{style.tabStencilY}} }, 300 );
	$('#tab_sticker').animate( { 'top': {{style.tabStickerY}} }, 300 );
}
function load_stencil( filename, maxRadius, asMask )
{
	map.setOptions( { mapTypeId: google.maps.MapTypeId.SATELLITE } );
	isPainting = false;
	isStenciling = asMask;
	isSticking = !asMask;
	make_map_grid();
	pro.reset_canvas();
	$('#processing_canvas').hide();
	$('#processing_stencil').show();
	$('#processing_stencil').fadeTo(0, cg_opacity);
	if (asMask)
	{
		__button_enable( $('#button_draw') );
		__button_disable( $('#button_save') );
		__button_disable( $('#button_discard') );
	}
	else
	{
		__button_disable( $('#button_draw') );
		__button_enable( $('#button_save') );
		__button_enable( $('#button_discard') );
	}
	pro_stencil.load( filename, (window.innerHeight * maxRadius) );
	pro_stencil.set_EDITING( true );
}
function switch_grid( newMode )
{
	draw_grid = newMode;
	if (draw_grid)
	{
		__button_on ($('#button_grid') );
		map.overlayMapTypes.insertAt( MAP_LAYER_GRID, new MapTypeCGGrid() );
	}
	else
	{
		__button_off ($('#button_grid') );
		map.overlayMapTypes.removeAt( MAP_LAYER_GRID );
	}
}
function switch_labels( newMode )
{
	current_map_type = newMode;
	map.setOptions( { mapTypeId: current_map_type } );
	if ( current_map_type == google.maps.MapTypeId.HYBRID)
		__button_on ($('#button_labels') );
	else
		__button_off ($('#button_labels') );
}
function upload_tiles()
{
	// finish canvas pixels
	// (Apply sticker, stencil, etc)
	pro.prepare_for_upload();
	
	// browse tiles
	for (var id in tileObjects)
	{
		var o = tileObjects[id];
		if ( pro.should_upload_tile( o.sx, o.sy, o.w, o.h ) )
		{
			//var data = document.getElementById("processing_canvas").toDataURL("image/png");
			//var data = $('#processing_canvas').toDataURL("image/png");
			//var data = pro.externals.canvas.toDataURL("image/png");
			
			// Create an empty canvas element
			var tileCanvas = document.createElement("canvas");
			tileCanvas.width = tile_size;
			tileCanvas.height = tile_size;
			// Copy the image contents to the canvas
			var ctx = tileCanvas.getContext("2d");
			ctx.drawImage( pro.externals.canvas, o.sx, o.sy, o.w, o.h, o.dx, o.dy, o.w, o.h );
			var data = tileCanvas.toDataURL("image/png");
			// upload new canvas
			if (data)
			{
				//alert("upload "+o.zoom+"/"+o.tile_x+"/"+o.tile_y);
				// hilight tile
				set_prog_div_prog( o.zoom, o.tile_x, o.tile_y, 1.0, "#ff0000", "Saving..." );
				// upload!
				var url = "/upload/"+o.zoom+"/"+o.tile_x+"/"+o.tile_y+"/";
				$.post(url, { 'data': data }, function (resp) {
					   //alert("POST RESP="+resp);
					   if (resp != "nok")
					   {
							//alert("POSTED "+resp);
							__print_console("POSTED "+resp);
							var js = jQuery.parseJSON(resp);
							set_prog_div_prog( js.zoom, js.x, js.y, 1.0, "#44ff44", "Refreshing..." );
							refresh_tile( js.zoom, js.x, js.y );
					   }
				} );
			}
		}
	}
	
	// Reset stencil
	pro_stencil.reset();
}

//
// Extrach url from 'background-image' css tag
function get_css_background_image ( obj )
{
	var url = obj.css('background-image');
	//
	// If: url("filename")
	var parts = url.split('"');
	if (parts.length == 3)
		return parts[1];
	//
	// If: url("filename")
	var p0 = url.indexOf("url(");
	var p1 = url.indexOf(")");
	if (p0 >= 0 && p1 >= 0)
		return url.substr(p0+4,p1-p0-4);
	//
	// Not found!
	return url;
}




////////////////////////////////////////////////////
//
// DRAW
// (Called from Processing)
//
var cg_draw = function cg_draw()
{
{% if debug %}
	$('#text_fps').html( pro.get_FRAMERATE() );
{% endif %}

	if (drawCoords)
	{
		if ( map_tile_se )
			$('#text_bounds_se').html( "bounds SE tile "+map_tile_se.x+","+map_tile_se.y+" / pixel "+map_pixel_se.x+","+map_pixel_se.y+" " );
		else
			$('#text_bounds_se').html( "bounds SE undefined " );
		if ( map_tile_nw )
			$('#text_bounds_nw').html( "bounds NW tile "+map_tile_nw.x+","+map_tile_nw.y+" / pixel "+map_pixel_nw.x+","+map_pixel_nw.y+" " );
		else
			$('#text_bounds_nw').html( "bounds NW undefined " );
		$('#text_center').html( "center tile "+center_tile.x+","+center_tile.y+" / pixel "+center_pixel.x+","+center_pixel.y+" / "+current_center.lng()+","+current_center.lat()+" " );
		if (isPainting)
			$('#text_mouse').html( "processing mouse "+pro.get_MOUSEX()+"/"+pro.get_MOUSEY()+" " );
		else if ( mouse_tile )
			$('#text_mouse').html( "mouse tile "+mouse_tile.x+","+mouse_tile.y+" / pixel "+mouse_pixel.x+","+mouse_pixel.y+" " );
		else
			$('#text_mouse').html( "mouse undefined " );
	}
}
















