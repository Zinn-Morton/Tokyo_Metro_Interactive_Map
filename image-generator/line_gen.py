from PIL import Image, ImageDraw, ImageFont

def draw_circle_with_text(text_top, circle_radius, brush_size, font_size, text_color, circle_color, bg_color, output_file, padding=4):
    # Calculate image size based on circle radius and padding
    image_size = (2 * (circle_radius + padding), 2 * (circle_radius + padding))

    # Create a new transparent image
    img = Image.new('RGBA', image_size, bg_color)
    draw = ImageDraw.Draw(img)

    # Calculate circle position with padding
    circle_center = (circle_radius + padding, circle_radius + padding)

    # Draw filled white circle
    draw.ellipse((padding, padding, 2 * circle_radius + padding, 2 * circle_radius + padding), fill=(255, 255, 255, 255))

    # Draw the circle outline
    draw.ellipse((circle_center[0] - circle_radius, circle_center[1] - circle_radius,
                  circle_center[0] + circle_radius, circle_center[1] + circle_radius), outline=circle_color, width=brush_size)

    # Define font and calculate text size
    font = ImageFont.truetype("arialbd.ttf", int(font_size * 1.1))  # Bolder font with increased font size
    text_width, text_height = draw.textsize(text_top, font=font)

    # Center vertically and horizontally
    text_x = (image_size[0] - text_width) / 2
    text_y = (image_size[1] - text_height) / 2 - 10

    # Draw text
    draw.text((text_x, text_y), text_top, fill=text_color, font=font)

    # Save the image to a file
    img.save(output_file)

# Shinjuku
text_top = "S"
draw_circle_with_text(text_top, 136, 64, 130, "black", (168, 189, 71), (255, 255, 255, 0), text_top + ".png", padding=13)

# Sakura Tram
text_top = "SA"
draw_circle_with_text(text_top, 136, 64, 80, "black", (244, 71, 122), (255, 255, 255, 0), text_top + ".png", padding=13)

# Asakusa
text_top = "A"
draw_circle_with_text(text_top, 136, 64, 120, "black", (255, 70, 54), (255, 255, 255, 0), text_top + ".png", padding=13)

# Nippori-Toneri Liner
text_top = "NT"
draw_circle_with_text(text_top, 136, 64, 80, "black", (209, 66, 161), (255, 255, 255, 0), text_top + ".png", padding=13)

# Oedo
text_top = "E"
draw_circle_with_text(text_top, 136, 64, 130, "black", (220, 44, 101), (255, 255, 255, 0), text_top + ".png", padding=13)

# Mita
text_top = "I"
draw_circle_with_text(text_top, 136, 64, 130, "black", (4, 117, 193), (255, 255, 255, 0), text_top + ".png", padding=13)