# Guía de Configuración de IP Estática en Windows 10
## Variedades Don Mati — Enlace Permanente para Celulares

Esta guía explica cómo configurar una **dirección IP fija/estática** en el computador principal de caja de "Variedades Don Mati" para que la URL de acceso desde los celulares **nunca cambie**, incluso si el computador se apaga por las noches o se reinicia el router.

---

## 🎯 Objetivo

Garantizar que el computador de caja siempre tenga la dirección local:
```text
IP Local:  192.168.1.10
Puerto:    3000
```
De esta forma, cualquier celular conectado al mismo Wi-Fi de la tienda siempre accederá escribiendo en su navegador:
👉 **`http://192.168.1.10:3000`**

---

## 🛠️ Paso a Paso para Configurar en Windows 10 (Sin entrar al router)

> [!NOTE]
> Esta configuración se realiza **una sola vez** directamente en el computador de la tienda. No requiere permisos del proveedor de internet (Claro, Movistar, Tigo, etc.).

### Paso 1: Abrir la Configuración de Red
1. En el teclado, presiona las teclas `Windows + I` para abrir **Configuración**.
2. Haz clic en **Red e Internet**.
3. En el menú de la izquierda, selecciona **Wi-Fi** (o **Ethernet** si el PC está conectado por cable al router).

### Paso 2: Editar la Configuración de IP
1. Haz clic sobre la red Wi-Fi de la tienda a la que está conectado el PC.
2. Desplázate hacia abajo hasta la sección **Configuración de IP**.
3. Haz clic en el botón **Editar**.
4. En el menú desplegable, cambia de **Automático (DHCP)** a **Manual**.
5. Activa el interruptor **IPv4**.

### Paso 3: Ingresar los Valores de Red Fija
Llena los campos con los siguientes datos recomendados:

| Campo | Valor a Ingresar | Explicación |
| :--- | :--- | :--- |
| **Dirección IP** | `192.168.1.10` | IP fija del computador de caja (número bajo fuera del rango DHCP habitual). |
| **Longitud del prefijo de subred** (o Máscara) | `24` *(o `255.255.255.0`)* | Máscara estándar de red doméstica/comercial clase C. |
| **Puerta de enlace (Gateway)** | `192.168.1.1` | Dirección IP del router de la tienda. |
| **DNS preferido** | `8.8.8.8` | Servidor DNS de Google (alta estabilidad). |
| **DNS alternativo** | `1.1.1.1` | Servidor DNS de Cloudflare. |

6. Haz clic en **Guardar**.

---

## 🔍 ¿Cómo comprobar que quedó bien configurado?

1. Presiona `Windows + R`, escribe `cmd` y presiona **Enter**.
2. En la ventana negra escribe:
   ```cmd
   ipconfig
   ```
3. Verifica que en el adaptador Wi-Fi aparezca:
   ```text
   Dirección IPv4. . . . . . . . . . . . . . : 192.168.1.10
   Máscara de subred . . . . . . . . . . . . : 255.255.255.0
   Puerta de enlace predeterminada . . . . . : 192.168.1.1
   ```

---

## 📱 ¿Cómo conectarse desde el celular?

1. Conecta el celular a la **misma red Wi-Fi** de la tienda.
2. Abre Google Chrome o Safari en el celular.
3. En la barra de direcciones escribe:
   ```text
   http://192.168.1.10:3000
   ```
4. Aparecerá de inmediato la pantalla de inicio de Gestienda.
5. **Recomendación para el celular:** En el menú del navegador del celular (los 3 puntos), selecciona **"Agregar a la pantalla principal"**. Así quedará como si fuera una aplicación instalada con su propio ícono en el celular.
