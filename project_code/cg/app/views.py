from django.contrib.auth import login as auth_login		# Rename para nao confundir com minha view
from django.contrib.auth import logout as auth_logout	# Rename para nao confundir com minha view
from django.contrib.auth import authenticate
from django.http import *
from django.shortcuts import *
from django.template import RequestContext
from django.contrib.gis.geos import *
#from django.contrib.gis.gdal import *
from django.contrib.gis.measure import *
from django.core.urlresolvers import *
from django.db import connection, transaction
from django.db.models import Q
from django.db.models import Count
from datetime import *
from dateutil import tz
from PIL import Image
import json
import base64
import random
import os

# CARTOGRAFFITI
from django.conf import settings
from app.models import *


########################################################
#
# SHORTCUTS
#
# Retorna ID unico para clientes
def get_cgid(request):
	if ('cgid' in request.COOKIES):
		cgid = request.COOKIES['cgid']
	else:
		cgid = "cg-";
		random.seed()
		for i in range(0,16):
			cgid += hex(int(random.uniform(0,15)))[2:3]
		print ("NEW ID %s" % cgid)
	return cgid
#
# Retorna tabela de configuracao
# TODO: Executar isto apenas uma vez por pagina
def get_globals():
	#print ("READ GLOBALS...")
	if (Config.objects.filter(id=1).count() == 0):
		Config.objects.get_or_create(id=1)
	return Config.objects.get(id=1)
#
# Local server
def is_localhost(request):
	if (request.META['HTTP_HOST'].startswith('localhost') or
		request.META['HTTP_HOST'].startswith('127.0.0.1') or
		request.META['HTTP_HOST'].startswith('10.1.1.') or
		request.META['HTTP_HOST'].startswith('192.168.1.')):
		return True
	else:
		return False
#
# Eh mobile?
def is_android(request):
	agent = request.META['HTTP_USER_AGENT']
	return ( re.search('Android',agent) )
def is_iphone(request):
	agent = request.META['HTTP_USER_AGENT']
	return ( re.search('iPhone',agent) or re.search('iPod',agent) )
def is_ipad(request):
	agent = request.META['HTTP_USER_AGENT']
	return ( re.search('iPad',agent) )
#
# Style
def get_style():
	buttonHeight = 50
	style = {
		#"fontFamily":			"Gill Sans",
		"fontFamily":			"Helvetica",
		"colorText":			"#FFFFFF",
		"colorBack":			"#333333",
		"colorLink":			"#FFFFFF",
		"colorLinkHover":		"#FFFFFF",
		"colorLinkActive":		"#FFFFFF",
		"colorLinkVisited":		"#FFFFFF",
		"colorShadow":			"#333333",
		"colorShadowLHover":	"#444444",
		"colorShadowActive":	"#333333",
		"colorTabBackground":	"#888888",
		"colorButton":			"#eeeeee",
		"maxBrushSize":			30,
		# Menus
		"leftWidth":			100,
		"rightWidth":			100,
		"buttonHeight":			buttonHeight,
		"tabBrushY":			buttonHeight*2,
		"tabStencilY":			buttonHeight*3,
		"tabStickerY":			buttonHeight*4,
		"tabContentHeight":		buttonHeight*10,	# Best for iPad
	}
	return style
#
# Substitui o render_to_response()
# Adicionando variaveis necessarias
def render_cg(request, name, params={}):
	globals = get_globals()
	#lang = get_lang(request)
	localhost = is_localhost(request)
	ipad = is_ipad(request)
	iphone = is_iphone(request)
	android = is_android(request)
	mobile = ( ipad or iphone or android )
	desktop = False
	if (ipad):
		device_name = "iphone"
	elif (iphone):
		device_name = "iphone"
	elif (android):
		device_name = "android"
	else:
		device_name = "desktop"
		desktop = True
	data = {
		'page':			name,
		'localhost':	localhost,
		'debug':		localhost,
		'globals':		globals,
		'online':		globals.online,
		'style':		get_style(),
		'mobile':		mobile,
		'ipad':			ipad,
		'iphone':		iphone,
		'android':		android,
		'desktop':		desktop,
		'device_name':	device_name,
		'url_donate':	"https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XWVK6SRV59YHQ",
		'url_facebook':	"http://www.facebook.com/pages/CartoGraffiti/223668204345566",
		}
	data.update(params)
	# Return!
	return render_to_response(name+'.html', data,
		context_instance=RequestContext(request) )		# Para conseguir usar {{user}}

#
# Convert metros para graus
def m_to_deg(m):
	return (m / 110574.2727)
def deg_to_m(deg):
	return (deg * 110574.2727)

#
# FILE SYSTEM
def get_project_path(request):
	if ( is_localhost(request) ):
		return "/Volumes/HDD/Dev/Django/cg/"
	else:
		return "/home/rsodre/webapps/django_cg/cg/"
# Tile files
def get_tile_path(request, zoom, x, y, level):
	path = "/static/tiles/" + str(zoom) + "/" + str(x) + "/" + str(y) + "/tile"
	for i in range(1,level):
		path += "_"
	path += ".png"
	return path
def get_local_tile_path(request, zoom, x, y, level):
	return get_project_path(request) + get_tile_path(request, zoom, x, y, level)

#
# Normalize Maps Tiles
def get_normalized_tiles(tile_size, zoom, x, y):
	# tile range in one direction range is dependent on zoom level
	# 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
	tileRange = (1 << zoom) * (256 / tile_size)
	# dont repeat across y-axis (vertically)
	if (y < 0 or y >= tileRange):
		return (None, None)
	# repeat across x-axis
	if (x < 0 or x >= tileRange):
		nx = (x % tileRange + tileRange) % tileRange
	else:
		nx = x
	# ok!
	return (nx, y)





##############################################
#
# CLIENTS
#
# Welcome
def index(request):
	# Redirects
	if (request.META['HTTP_HOST'] == 'paint.cartograffiti.net'):
		return paint(request)
	if (request.META['HTTP_HOST'] == 'view.cartograffiti.net'):
		return view(request)

	#BASE_DIR = os.path.dirname(os.path.dirname(__file__))
	#print ("...FILE   = " + __file__)
	#print ("...BASE1  = " + os.path.dirname(__file__))
	#print ("...BASE2  = " + os.path.dirname(os.path.dirname(__file__)))
	#print ("...STATIC = " + os.path.join(BASE_DIR, "static"))

	#
	# Just view...
	return render_cg(request, 'index')
#
# Donate thanks
def thanks(request):
	return render_cg(request, 'thanks')
#
# Localhost shortcuts
def localhost_view(request):
	if (is_localhost(request)):
		return view(request)
	else:
		return HttpResponseRedirect( "http://view.cartograffiti.net/" )
def localhost_paint(request):
	if (is_localhost(request)):
		return paint(request)
	else:
		return HttpResponseRedirect( "http://paint.cartograffiti.net/" )
#
# Regular viewer
def view(request, zoom=None, lat=None, lng=None):
	globals = get_globals()
	data = {}
	# Offline?
	if (globals.online == False):
		return render_cg(request, 'offline')
	# Send to location
	if (zoom!=None and lat!=None and lng!=None):
		data.update( {
			'zoom':		zoom,
			'lat':		lat,
			'lng':		lng,
		} )
	return render_cg(request, 'view', data)
#
# Painter view
def paint(request, zoom=None, lat=None, lng=None):
	globals = get_globals()
	cgid = get_cgid(request)
	data = {}
	# Offline?
	if (globals.online == False or globals.viewonly == True):
		return render_cg(request, 'offline')
	# Send to location
	if (zoom!=None and lat!=None and lng!=None):
		data.update( {
			'zoom':		zoom,
			'lat':		lat,
			'lng':		lng,
		} )
	# coords from HOME cookie?
	elif ('home_zoom' in request.COOKIES and 'home_lat' in request.COOKIES and 'home_lng' in request.COOKIES):
		data.update( {
			'zoom':		request.COOKIES['home_zoom'],
			'lat':		request.COOKIES['home_lat'],
			'lng':		request.COOKIES['home_lng'],
		} )
	# coords from POST data?
	elif ('zoom' in request.POST and 'lat' in request.POST and 'lng' in request.POST):
		data.update( {
			'zoom':		request.POST['zoom'],
			'lat':		request.POST['lat'],
			'lng':		request.POST['lng'],
		} )
	# Save Cookie and go!
	resp = render_cg(request, 'paint', data)
	if ('cgid' not in request.COOKIES):
		resp.set_cookie('cgid', cgid)
	if ('home_zoom' in request.COOKIES):
		resp.delete_cookie('home_zoom')
	if ('home_lat' in request.COOKIES):
		resp.delete_cookie('home_lat')
	if ('home_lng' in request.COOKIES):
		resp.delete_cookie('home_lng')
	return resp
#
# CG IMAGE TILE
def tile(request, zoom, x, y):
	#return HttpResponseRedirect( "/static/images/tile.png" )
	# Exist?
	path = get_local_tile_path( request, zoom, x, y, 1 )
	if ( not os.path.exists( path ) ):
		#return HttpResponseRedirect( "/static/images/tile0.png" )
		return HttpResponseNotFound()
	# Send static link
	path = get_tile_path( request, zoom, x, y )
	#print ("TILE %d %d %d %s" % ( int(zoom), int(x), int(y), path ))
	return HttpResponseRedirect( path )
#
# Shares viewer
def shares(request):
	globals = get_globals()
	data = {
		'page':		'shares',
	}
	# Offline?
	if (globals.online == False):
		return render_cg(request, 'offline')
	# Send to random share location
	(zoom, lat, lng) = get_random_share()
	if (zoom != None and lat != None and lng != None):
		data.update( {
			'zoom':		zoom,
			'lat':		lat,
			'lng':		lng,
		} )
	return render_cg(request, 'view', data)
def get_random_share():
	# Get all shares
	ss = Share.objects.all()
	if (ss.count() == 0):
		return (None,None,None)
	# Get random share
	random.seed()
	i = int(random.uniform(0,ss.count()))
	s = ss[i]
	#print ("SHARE   count %d   random %d" % (ss.count(),i))
	return (s.zoom, s.center.x, s.center.y)



##############################################
#
# AJAX
#
# Set user home for refresh
def set_home(request, zoom, lat, lng):
	# Save Cookie and go!
	resp = HttpResponse("ok")
	resp.set_cookie('home_zoom', zoom)
	resp.set_cookie('home_lat', lat)
	resp.set_cookie('home_lng', lng)
	return resp
#
# RECEIVE IMAGE TILE
def upload(request, zoom, x, y):
	globals = get_globals()
	data = {};
	# Get file Data
	if ('data' not in request.POST):
		print (">>> NO DATA!")
		return HttpResponse("nok")
	postdata = request.POST['data']
	(header,rawdata) = postdata.split(',')
	print (">>> GOT DATA len (%d) header (%s)" % (len(postdata),header))
	#print (">>> GOT DATA len (%d) header (%s) raw (%s)" % (len(postdata),postdata,rawdata))
	# Normalize tiles
	(nx, ny) = get_normalized_tiles(globals.tile_size, int(zoom), int(x), int(y))
	if (nx == None or ny == None):
		print (">>> OUTISIDE BOUNDS!")
		return HttpResponse("nok")
	print (">>> TILE %d %d %d" % (int(zoom),nx,ny))
	# Get file path
	path = get_local_tile_path( request, zoom, nx, ny, 1 )
	# Make dir
	if not os.path.exists( os.path.dirname(path) ):
		os.makedirs( os.path.dirname(path), 0o777 )
	# Tile exists?
	if not os.path.exists( path ):
		print (">>> NEW PNG %s" % path)
		# NEW tile
		f = open( path, 'wb' )
		f.write( base64.b64decode( rawdata ) )
		f.close()
	else:
		print (">>> MERGE PNG %s" % path)
		# Make temp
		temp = path+".temp"
		f = open( temp, 'wb' )
		f.write( base64.b64decode( rawdata ) )
		f.close()
		# PASTE to current tile
		#new = Image.open( get_project_path(request)+"/static/images/tile128.png" );
		new = Image.open( temp )
		old = Image.open( path )
		old.paste( new, (0, 0), new )
		old.save( path )
		# Erase temp
		os.remove(temp)
	# set permissions
	os.chmod( path, 0o777 )
	#
	# Save zoomed down levels
	new_size = globals.tile_size
	for level in range(2,globals.tile_levels+1):
		new_path = get_local_tile_path( request, zoom, nx, ny, level )
		new_size /= 2
		new_size = int(new_size)
		new = Image.open( path ).resize( (new_size,new_size), Image.ANTIALIAS )
		new.save( new_path )
		print ("LEVEL %d sz %d %s" % (level, new_size, new_path))
	#
	# SAVE on database
	# TODO: Calcular corretamente coord_nw e coord_se
	t = Tile()
	t.zoom = zoom
	t.tile_x = nx
	t.tile_y = ny
	t.coord_nw = Point(0,0)
	t.coord_se = Point(0,0)
	t.save()
	#
	# Responde com parametros para notificar tile
	data = {
		'zoom':		zoom,
		'x':		x,
		'y':		y,
	}
	return HttpResponse(json.dumps(data), content_type="text/plain")
#
# SAVE SHARES
def sharing(request, zoom, lat, lng):
	center = Point( float(lat), float(lng) )
	# Evita shares duplicados
	ss = Share.objects.filter(zoom=zoom,center=center)
	if (ss.count() > 0):
		print (">>> DUPLICATED SHARE")
		return HttpResponse("already shared")
	# Save share
	s = Share()
	s.timestamp = datetime.now(tz.gettz(settings.TIME_ZONE))
	s.zoom = zoom
	s.center = center
	s.save()
	print (">>> NEW SHARE")
	return HttpResponse("ok")
#
# GET NEW RANDOM SHARE
def refresh_shares(request):
	data = {}
	(zoom, lat, lng) = get_random_share()
	if (zoom != None and lat != None and lng != None):
		data.update( {
			'zoom':		zoom,
			'lat':		lat,
			'lng':		lng,
		} )
	return HttpResponse(json.dumps(data), content_type="text/plain")






#####################################################
#
# RESPOSTA PADRAO AJAX
#
def response_ajax(params={}, udid=None):
	globals = get_globals()
	data = {
		'online':	globals.online,
	}
	data.update(params)
	# Make Response
	json = jsonjson.dumps(data)
	resp = HttpResponse(json)
	# Responder
	return resp





