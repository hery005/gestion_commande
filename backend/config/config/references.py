import uuid


def generate_unique_reference(model, field_name, prefix):
    while True:
        reference = f"{prefix}-{uuid.uuid4().hex.upper()}"
        if not model.objects.filter(**{field_name: reference}).exists():
            return reference
