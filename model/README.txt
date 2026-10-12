Modelul antrenat de tine (YOLO11n, doar cifre 0-9, intrare 512x512):
  marcaj.onnx     - detectorul
  classes.json    - {"names": ["0",...,"9"], "imgsz": 512, "conf": 0.35}
Ambele fisiere trebuie sa ajunga pe site in folderul  model/  (langa index.html), adica la adresele
  https://SITE/model/classes.json   si   https://SITE/model/marcaj.onnx
Verificare: deschide aceste doua adrese in browser - classes.json trebuie sa afiseze textul, marcaj.onnx sa descarce ~10 MB.
