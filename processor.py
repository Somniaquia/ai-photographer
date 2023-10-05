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
        self.pipe.safety_checker = lambda images, clip_input: (images, False)
    
    def process(self, image, style: str):
        image = np.array(image.resize((512, 512)))

        low_threshold = 100
        high_threshold = 200

        image = cv2.Canny(image, low_threshold, high_threshold)
        image = image[:, :, None]
        image = np.concatenate([image, image, image], axis=2)
        image = Image.fromarray(image)

        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu").manual_seed(2)

        output = self.pipe(
            style + ", best quality, extremely detailed",
            image,
            negative_prompt="monochrome, lowres, bad anatomy, worst quality, low quality",
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
    print("Received websocket message")
    async for message in websocket:
        data = json.loads(message)
        image_index = data.get('image_index', '')

        try:
            with open(f'image.png', 'rb') as f:
                image = Image.open(f)

                processed_image = processor.process(image, "A Ghibli character.")
            processed_image.images[0].save(f'processed_image_{image_index}.png')

            await websocket.send(json.dumps({"success": True}))
        except Exception as e:
            print(f"Error processing image {image_index}: {str(e)}")
            await websocket.send(json.dumps({"success": False, "error": e}))

processor = DiffusionProcessor("runwayml/stable-diffusion-v1-5") # DiffusionProcessor("sd-dreambooth-library/messy_sketch_art_style")

start_server = websockets.serve(handle_socket, "localhost", "8765")
print("WebSocket Server Running on ws://localhost:8765")
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()