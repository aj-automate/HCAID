import os

# De app weigert te starten zonder wachtwoord; tests gebruiken een vast testwachtwoord.
os.environ.setdefault("APP_PASSWORD", "test-wachtwoord-voor-pytest")
