from PIL import Image, ImageDraw, ImageFont

def draw_circle_with_text(text_top, number_bottom, circle_radius, brush_size, font_size, text_color, number_color, circle_color, bg_color, output_file):
    # Calculate image size based on circle radius
    image_size = (2 * circle_radius, 2 * circle_radius)

    # Create a new transparent image
    img = Image.new('RGBA', image_size, bg_color)
    draw = ImageDraw.Draw(img)

    # Draw filled white circle
    draw.ellipse((0, 0, 2 * circle_radius, 2 * circle_radius), fill=(255, 255, 255, 255))

    # Draw the circle outline
    circle_center = (circle_radius, circle_radius)
    draw.ellipse((circle_center[0] - circle_radius, circle_center[1] - circle_radius,
                  circle_center[0] + circle_radius, circle_center[1] + circle_radius), outline=circle_color, width=brush_size)

    # Define font and calculate text size
    font = ImageFont.truetype("arialbd.ttf", int(font_size * 1.1))  # Bolder font with increased font size
    text_width, text_height = draw.textsize(text_top, font=font)
    number_width, number_height = draw.textsize(str(number_bottom), font=font)

    # Calculate the total height of both texts
    total_height = text_height + number_height

    # Move text up a bit
    vertical_offset = 10

    # Center vertically as a group
    text_y = circle_center[1] - total_height / 2 - vertical_offset

    # Draw text
    draw.text((circle_center[0] - text_width / 2, text_y), text_top, fill=text_color, font=font)
    draw.text((circle_center[0] - number_width / 2, text_y + text_height), str(number_bottom), fill=number_color, font=font)

    # Save the image to a file
    img.save(output_file)

# Example usage
text_top = "S"
for i in range(1, 22):
    btm_text = str(i) if i > 9 else "0" + str(i)
    draw_circle_with_text(text_top, btm_text, 136, 25, 100, "black", "black", (168, 189, 71), (255, 255, 255, 0), text_top.lower() + "-" + btm_text + ".png")
