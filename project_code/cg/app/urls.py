from django.conf.urls import patterns, include, url
#from django.conf.urls.defaults import *

urlpatterns = patterns('app.views',

	# online player
	#url(r'^enter/(?P<udid>[0-9a-zA-Z]+)/(?P<tipo>[a-z]+)/(?P<width>[0-9]+)/(?P<height>[0-9]+)/(?P<lat>[-0-9\.]+)/(?P<lng>[-0-9\.]+)/', 'enter'),

	# ajax
	url(r'set_home/(?P<zoom>[0-9]+)/(?P<lat>[0-9.-]+)/(?P<lng>[0-9.-]+)/', 'set_home', name='set_home'),
	url(r'upload/(?P<zoom>[0-9]+)/(?P<x>[0-9-]+)/(?P<y>[0-9-]+)/', 'upload', name='upload'),
	url(r'sharing/(?P<zoom>[0-9]+)/(?P<lat>[0-9.-]+)/(?P<lng>[0-9.-]+)/', 'sharing', name='sharing'),
	url(r'refresh_shares/', 'refresh_shares', name='refresh_shares'),

	#localhost
	url(r'paint/', 'localhost_paint', name='localhost_paint'),
	url(r'view/', 'localhost_view', name='localhost_view'),

	# webview
	# TODO::RELEASE:: mandar shares para 'view' e nao 'paint'
	#url(r'(?P<zoom>[0-9]+)/(?P<lat>[0-9.-]+)/(?P<lng>[0-9.-]+)/', 'view', name='view'),
	url(r'(?P<zoom>[0-9]+)/(?P<lat>[0-9.-]+)/(?P<lng>[0-9.-]+)/', 'paint', name='paint'),
	url(r'tile/(?P<zoom>[0-9]+)/(?P<x>[0-9-]+)/(?P<y>[0-9-]+)/', 'tile', name='tile'),
	url(r'shares/', 'shares', name='shares'),
	url(r'thanks/', 'thanks', name='thanks'),
	url(r'', 'index', name='index'),
)
