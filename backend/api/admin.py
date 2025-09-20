from django.contrib import admin
from .models import UserProfile, EPA, Milestone, Reflection


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    search_fields = ("user__username", "user__email")


@admin.register(EPA)
class EPAAdmin(admin.ModelAdmin):
    list_display = ("code", "title")
    search_fields = ("code", "title")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("epa", "code")
    search_fields = ("epa__code", "code")
    list_filter = ("epa",)


@admin.register(Reflection)
class ReflectionAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "epa", "milestone", "created_at")
    search_fields = ("title", "author__username")
    list_filter = ("epa", "milestone")

# Register your models here.
