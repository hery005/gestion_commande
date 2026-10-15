from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations


def hash_legacy_passwords(apps, schema_editor):
    User = apps.get_model("utilisateurs", "Utilisateurs")
    database = schema_editor.connection.alias

    for user in User.objects.using(database).only("pk", "password").iterator():
        try:
            identify_hasher(user.password)
        except ValueError:
            if not user.password.startswith("!"):
                User.objects.using(database).filter(pk=user.pk).update(
                    password=make_password(user.password)
                )


class Migration(migrations.Migration):
    dependencies = [
        ("utilisateurs", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(hash_legacy_passwords, migrations.RunPython.noop),
    ]
