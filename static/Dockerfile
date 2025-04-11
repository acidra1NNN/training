FROM alpine:3.21.2
# Install necessary packages
RUN apk update && apk add git gcc python3-dev linux-headers libffi-dev libc-dev musl-dev python3 py3-pip

ENV TZ=Europe/Minsk
ENV PYTHONUNBUFFERED=1


# Create working directory
RUN mkdir -p /home/AI/comp/static
    
WORKDIR /home/AI/comp/static

#venv for py
RUN python3 -m venv /home/AI/venv
ENV PATH="/home/AI/venv/bin:$PATH"
# Copy application files
#COPY . /home/AI/comp/

COPY  back.png /home/AI/comp/static
COPY  templates/ /home/AI/comp/static
COPY  requirements.txt /home/AI/comp/static
COPY  script_https.js /home/AI/comp/static
COPY  style.css s/home/AI/comp/static

# Install dependencies
RUN pip install  --no-cache-dir -r requirements.txt

# Expose the correct port
EXPOSE 15601


