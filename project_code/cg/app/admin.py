from django.contrib.gis import admin

# Set to Sampa
# http://docs.djangoproject.com/en/dev/ref/contrib/gis/admin/
class GeoSampa(admin.OSMGeoAdmin):
	default_lon = -5191210.02610
	default_lat = -2698728.71598
	default_zoom = 11

from app.models import Tile
from app.models import Share
from app.models import Config

admin.site.register(Tile, GeoSampa)
admin.site.register(Share, GeoSampa)
admin.site.register(Config, GeoSampa)

