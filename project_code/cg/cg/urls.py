from django.conf.urls import patterns, include, url
from django.conf import settings
from django.conf.urls.static import static

from django.contrib import admin
from django.contrib.gis import admin
from django.views.static import serve
admin.autodiscover()

urlpatterns = patterns('',
	# Admin:
	(r'^admin/doc/', include('django.contrib.admindocs.urls')),
	(r'^admin/', include(admin.site.urls)),

	# Static files
	#(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': '/Volumes/HDD/Dev/Django/cg/static/', 'show_indexes': True}),

	#
	# CARTOGRAFFITI
	#
	(r'', include('app.urls')),
)# + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
