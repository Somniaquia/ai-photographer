import cv2
import torch
import numpy as np
from diffusers import UniPCMultistepScheduler
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel

class DiffusionProcessor:
    image = None

    def __init__(self, model_id: str):
        self.controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-canny", torch_dtype=torch.float16)
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(model_id, controlnet=self.controlnet, torch_dtype=torch.float16)
        self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
        self.pipe.enable_model_cpu_offload()
        self.pipe.enable_xformers_memory_efficient_attention()
    
    def process(self, image, style: str):
        image = np.array(image)

        low_threshold = 100
        high_threshold = 200

        image = cv2.Canny(image, low_threshold, high_threshold)
        image = image[:, :, None]
        image = np.concatenate([image, image, image], axis=2)
        image = Image.fromarray(image)

        generator = torch.Generator(device="cuda").manual_seed(2)

        output = self.pipe(
            style + ", best quality, extremely detailed",
            self.canny_image,
            negative_prompt=["monochrome, lowres, bad anatomy, worst quality, low quality"],
            num_inference_steps=20,
            generator=generator,
        )

        return output


import asyncio
import websockets
import base64
import json
from io import BytesIO
from PIL import Image

async def handle_socket(websocket, path):
    async for message in websocket:
        data = json.loads(message)
        image_data = data.get('image_data', '').split(",")[1]
        image_index = data.get('image_index', '')

        decoded_image = base64.b64decode(image_data)
        image = Image.open(BytesIO(decoded_image))

        processed_image = processor.process(image)

        # Send the images back with Base64 string format
        buffered = BytesIO()
        processed_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        await websocket.send(json.dumps({"image_data": img_str}))

processor = DiffusionProcessor("runwayml/stable-diffusion-v1-5") # DiffusionProcessor("sd-dreambooth-library/messy_sketch_art_style")

start_server = websockets.serve(handle_socket, "localhost", "8765")
print("WebSocket Server Running on ws://localhost:8765")
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()