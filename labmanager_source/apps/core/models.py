from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides self-updating 'created_at' and 'updated_at' fields.
    This model should be inherited by other models that need timestamp tracking.
    """
    created_at = models.DateTimeField(
        _("Created at"), 
        auto_now_add=True,
        help_text=_("Date and time when the record was created")
    )
    updated_at = models.DateTimeField(
        _("Updated at"), 
        auto_now=True,
        help_text=_("Date and time when the record was last updated")
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """
        Override save method to ensure proper timestamp handling.
        """
        super().save(*args, **kwargs)

