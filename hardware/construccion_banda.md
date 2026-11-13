# Cómo construir la banda transportadora

## Medidas (moto 1:12, de unos 17 cm de largo)

```
 entrada   E1 faro   E2 temp   E3 gases   E4 rueda   salida
 |──15──|───20────|───20────|────20────|────20────|──10──|   ≈ 105 cm entre ejes
          IR1        IR2        IR3        IR4
```

- **Base:** MDF o triplex de 110 × 25 cm.
- **Ancho de la banda:** 6–8 cm, y 2–3 cm más ancha que las ruedas de la moto.
- **Altura de la banda sobre la base:** 4–5 cm. Así cabe el motor TT debajo del rodillo motriz.
- Con una moto 1:18 (unos 11 cm), las estaciones se acercan a 15 cm y la base queda de unos 80 cm.

## 1. Rodillos y ejes

- **Dos rodillos de PVC de ½"**, uno en cada extremo, cortados 1 cm más anchos que la banda y con tapones en las puntas. El eje pasa por el centro de los tapones.
- **Motriz (salida):** el eje D del motor TT entra a presión en un tapón, con un poco de silicona. El motor se atornilla a un soporte de balso de 5 mm.
- **Tensor (entrada):** el soporte tiene una **ranura** de unos 2 cm en vez de un agujero. Al mover el eje dentro de la ranura se tensa la banda; luego se fija con tuerca.
- **Para que no patine:** forrar el rodillo motriz con una vuelta de cinta de aislar o un pedazo de neumático. Darle forma un poco abombada (más gruesa en el centro, "crowning") con 2 o 3 vueltas extra de cinta en el medio; así la banda se centra sola.

## 2. Cama de deslizamiento (lo que casi todos olvidan)

Debajo del tramo superior de la banda va una **tabla de balso de 3 mm, lisa**, entre los dos rodillos. Sin ella, la banda se hunde con el peso de la moto y las paradas no se repiten. Lijarla y, si se puede, ponerle cinta de embalar encima para que la banda deslice mejor.

## 3. La banda: dos opciones

**A. Neumático de bicicleta (recomendado si hay uno usado):**

- Se corta el tubo interior a lo largo y se recorta un rectángulo del ancho de la banda. Se cierra en un lazo uniendo las puntas con un traslapo de 2 cm, pegante de contacto (Boxer) y una puntada de hilo.
- Ventajas: agarra bien, es elástico (se tensa solo) y es durable.

**B. Foami de 2 mm (lo que propone Juan Diego):**

- Cortar tiras del ancho de la banda y unirlas hasta el largo total: unos 2 × 105 cm + 2 × perímetro del rodillo, **más o menos 2,2 m**.
- Unión en **bisel** (cortes diagonales a 45°) con traslapo de 2–3 cm, pegante de contacto y, por dentro, un **parche de cinta de tela** (cinta americana). La unión a tope sola se abre a la primera vuelta.
- El foami se estira con el uso: el tensor de ranura es obligatorio. Por dentro se puede reforzar con cinta de tela a lo largo.

## 4. Guías y moto

- **Guías laterales:** listones de balso de 10×10 mm pegados a 1 cm de cada borde de la banda, de modo que la moto quepa justa.
- **Moto parada:** las ruedas van sobre la banda. Si se cae, se le pegan dos "estabilizadores" (palitos de balso a los lados, como rueditas de bicicleta de niño) que rocen las guías.
- **E4, rueda trasera:** la rueda tiene que poder girar sin que la moto avance. En E4 la **cama tiene una ventana** de 3 cm donde la banda pasa sobre un rodillo libre. El rodillo de goma del servo 4 entra **desde arriba o desde el lado** y empuja la rueda trasera. Mientras tanto, un tope, que puede ser el mismo brazo del servo, sostiene la moto para que no se vaya.

## 5. Brazos con servo

- Brazos de balso de 5 mm, de unos 6–8 cm, atornillados al disco (horn) del servo.
- **Reposo = 0°:** el brazo queda paralelo a la banda, por fuera de la guía.
- **Medida = 90°:** el sensor queda frente al faro, al motor o al escape.
- Calibrar los ángulos con `CFG;servo_medida=85`, etc., desde el monitor serial.
- **E1:** la LDR va dentro de un tubo negro de 2–3 cm (cámara oscura) que queda frente al faro.

## 6. Prueba antes de cablear todo

1. Banda sola con el motor a 5 V directo: ¿gira centrada durante 5 minutos?
2. Agregar el L298N y el ESP32: `CFG;pwm_banda=120` y subir hasta que la moto avance sin saltos.
3. Poner cada IR y ajustar su potenciómetro azul para que detecte la moto a 1–2 cm, pero no la guía del frente.
