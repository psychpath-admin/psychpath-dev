from rest_framework import serializers
from .models import EPA, Milestone, Reflection


class EPASerializer(serializers.ModelSerializer):
    class Meta:
        model = EPA
        fields = ["id", "code", "title", "description"]


class MilestoneSerializer(serializers.ModelSerializer):
    epa = EPASerializer(read_only=True)
    epa_id = serializers.PrimaryKeyRelatedField(
        queryset=EPA.objects.all(), source="epa", write_only=True
    )

    class Meta:
        model = Milestone
        fields = ["id", "epa", "epa_id", "code", "description"]


class ReflectionSerializer(serializers.ModelSerializer):
    epa = EPASerializer(read_only=True)
    epa_id = serializers.PrimaryKeyRelatedField(
        queryset=EPA.objects.all(), source="epa", allow_null=True, required=False, write_only=True
    )
    milestone = MilestoneSerializer(read_only=True)
    milestone_id = serializers.PrimaryKeyRelatedField(
        queryset=Milestone.objects.all(), source="milestone", allow_null=True, required=False, write_only=True
    )

    class Meta:
        model = Reflection
        fields = [
            "id",
            "title",
            "content",
            "epa",
            "epa_id",
            "milestone",
            "milestone_id",
            "created_at",
            "updated_at",
        ]


