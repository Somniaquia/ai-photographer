print("Loaded")

import cv2
import torch
import numpy as np
from diffusers import UniPCMultistepScheduler
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
import asyncio

class DiffusionProcessor:
    image = None

    def __init__(self, model_id: str):
        self.controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-canny", torch_dtype=torch.float16)
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(model_id, controlnet=self.controlnet, torch_dtype=torch.float16)
        self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
        self.pipe.enable_model_cpu_offload()
        self.pipe.enable_xformers_memory_efficient_attention()
        self.pipe.safety_cheker = lambda images, a: (images, False)
        self.pipe.run_safety_checker = lambda images, a, b: (images, False)

    async def callback(self, step, timestep, latents):
        f = open("progress.txt", "a")
        f.write("-")
        f.close()
    
    def crop_to_center(self, image, new_width, new_height):
        width, height = image.size
        left = (width - new_width)/2
        top = (height - new_height)/2
        right = (width + new_width)/2
        bottom = (height + new_height)/2

        return image.crop((left, top, right, bottom))

    def process(self, image, styles, websocket):
        self.websocket = websocket
        low_threshold = 50
        high_threshold = 100

        image = self.crop_to_center(image, image.size[1], image.size[1]).resize((512, 512), resample=Image.LANCZOS)
        image = cv2.Canny(np.array(image), low_threshold, high_threshold)

        image = image[:, :, None]
        image = np.concatenate([image, image, image], axis=2)
        image = Image.fromarray(image)

        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu").manual_seed(2)

        output = self.pipe(
            styles[0] + ", (best quality, masterpiece)",
            image,
            negative_prompt=styles[1] + ", worst quality, low quality, monochrome",
            num_inference_steps=20,
            # callback=self.callback,
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
    open('progress.txt', 'w').close()
    async for message in websocket:
        data = json.loads(message)
        image_index = data.get('image_index', '')

        try:
            with open(f'image_{image_index}.png', 'rb') as f:
                image = Image.open(f)

                processed_image = processor.process(image, [open("config/prompt.txt", "r").readlines()[0], open("config/prompt.txt", "r").readlines()[1]], websocket)
            processed_image.images[0].transpose(Image.FLIP_LEFT_RIGHT).save(f'processed_image_{image_index}.png')

            await websocket.send(json.dumps({"success": True, "progress": 20}))
        except Exception as e:
            print(f"Error processing image {image_index}: {str(e)}")
            await websocket.send(json.dumps({"success": False, "error": e, "progress": None }))

processor = DiffusionProcessor(open("config/model.txt", "r").read())
# Lykon/DreamShaper <- For Halloween stuff
# gsdf/Counterfeit-V2.5 <- every day we stray away from god

start_server = websockets.serve(handle_socket, "localhost", "8765")
print("WebSocket Server Running on ws://localhost:8765")
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()