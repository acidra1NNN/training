FROM python:3.9-slim

# Install necessary packages
RUN apt-get update && apt-get install -y git gcc python3-dev libffi-dev libc-dev && apt-get clean

ENV TZ=Europe/Minsk

# Create working directory
RUN mkdir -p /home/AI/comp

WORKDIR /home/AI/comp

# Copy application files
COPY . /home/AI/comp/
# Or specify exact files needed:
# COPY ../requirements_web.txt /home/AI/comp/
# COPY ../templates /home/AI/comp/templates
# COPY . /home/AI/comp/static

# Install dependencies
RUN pip install --no-cache-dir -r requirements_web.txt

# Expose the correct port
EXPOSE 15601

# Set the correct CMD
CMD ["python", "-m", "run", "--host=0.0.0.0", "--port=15601"]
