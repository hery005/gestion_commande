from django.db import migrations


def assign_owner_from_parent(apps, schema_editor):
    database = schema_editor.connection.alias
    models_and_parents = (
        ('produit', 'Produit', 'fk_id_fournisseur'),
        ('commandes', 'Commande', 'fk_id_fournisseur'),
        ('facture', 'Facture', 'fk_id_commande'),
        ('paiement', 'Paiement', 'fk_id_facture'),
    )

    for app_label, model_name, parent_field in models_and_parents:
        model = apps.get_model(app_label, model_name)
        queryset = (
            model.objects.using(database)
            .filter(cree_par__isnull=True)
            .select_related(parent_field)
        )
        for record in queryset.iterator():
            parent = getattr(record, parent_field)
            if parent and parent.cree_par_id:
                model.objects.using(database).filter(pk=record.pk).update(
                    cree_par_id=parent.cree_par_id,
                )


class Migration(migrations.Migration):
    dependencies = [
        ('commandes', '0003_alter_commande_reference'),
        ('facture', '0003_alter_facture_reference_facture'),
        ('fournisseurs', '0003_alter_fournisseur_email_and_more'),
        ('paiement', '0003_alter_paiement_reference_paiement'),
        ('produit', '0003_alter_produit_codeproduit'),
    ]

    operations = [
        migrations.RunPython(assign_owner_from_parent, migrations.RunPython.noop),
    ]
