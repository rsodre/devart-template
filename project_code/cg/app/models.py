#from django.db import models
from django.contrib.gis.db import models
from django import forms
from django.forms import ModelForm
from django.conf import settings
from django.contrib.auth.models import User


#
# GRAFFITI LAYER TILE INDEX
# 
class Tile(models.Model):
	zoom			= models.IntegerField(default=2)
	tile_x			= models.IntegerField(default=0)
	tile_y			= models.IntegerField(default=0)
	coord_nw		= models.PointField()
	coord_se		= models.PointField()
	objects			= models.GeoManager()
	# Name for admin
	class Meta:
		verbose_name_plural = "Tile"
	# String representation of the model
	def __unicode__(self):
		return "Tile #" + str(self.id)+"/"+str(self.zoom)+"/"+str(self.tile_x)+"/"+str(self.tile_y)

#
# SHARES
# 
class Share(models.Model):
	timestamp		= models.DateTimeField()
	zoom			= models.IntegerField()
	center			= models.PointField()
	objects			= models.GeoManager()
	# Name for admin
	class Meta:
		verbose_name_plural = "Share"
	# String representation of the model
	def __unicode__(self):
		return "Share #" + str(self.id)+"/"+str(self.zoom)+"/"+str(self.center)

#
# CONFIGURACAO
#
class Config(models.Model):
	online					= models.BooleanField(default=True, verbose_name='Online?')
	viewonly				= models.BooleanField(default=False, verbose_name='View Only?')
	tile_size				= models.IntegerField(default=128, verbose_name='Tile Size (pixels)')
	tile_levels				= models.IntegerField(default=2, verbose_name='Tile zoom levels to save')
	shares_refresh_rate		= models.IntegerField(default=30, verbose_name='Shares refresh rate (seconds)')
	# Name for admin
	class Meta:
		verbose_name_plural = "Config"
	# String representation of the model
	def __unicode__(self):
		return "Config #" + str(self.id)


