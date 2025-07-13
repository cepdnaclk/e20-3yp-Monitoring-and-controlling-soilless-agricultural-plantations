import qrcode
import json

# Example device data
device_data = {
    "id": "25001",
    "name": "Test Device 1",
    "type": "Controller",
    "status": "Inactive",
    "connectivity": "WiFi",
    "power": "15",
    "icon": "sensors", #settings,sensors
    "description": "An intelligent controller that automates water and nutrient delivery, optimizing resource usage and plant health.",
    "imageUrl": "https://res.cloudinary.com/dnqs4ihau/image/upload/v1740202616/device3_wpfoi6.jpg"
}

# Convert dictionary to JSON string
device_json = json.dumps(device_data)

# Generate QR Code
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(device_json)
qr.make(fit=True)

# Create an image from the QR Code
qr_image = qr.make_image(fill="black", back_color="white")

# Save the QR Code as an image file
qr_filename = "test_qr.png"
qr_image.save(qr_filename)

print(f" QR Code saved as '{qr_filename}'")


