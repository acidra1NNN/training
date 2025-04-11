FROM alpine:3.21.2

# Установка необходимых пакетов
RUN apk update && apk add git gcc python3-dev linux-headers libffi-dev libc-dev musl-dev python3 py3-pip

# Настройка среды
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=training_kube_http.py
ENV TZ=Europe/Minsk
ENV FLASK_RUN_HOST=0.0.0.0

# Создаем рабочую директорию
RUN mkdir -p /home/AI/comp/server
RUN mkdir -p /home/AI/comp/server/data
RUN mkdir -p /home/AI/comp/server/logs
WORKDIR /home/AI/comp/server

# Создание и активация виртуального окружения
RUN python3 -m venv /home/AI/venv
ENV PATH="/home/AI/venv/bin:$PATH"

# Обновляем pip
RUN pip install --upgrade pip 

# Копируем файлы training.py
COPY requirements.txt /home/AI/comp/server
COPY data/ /home/AI/comp/server/data
COPY logs/ /home/AI/comp/server/logs
COPY training_kube_http.py /home/AI/comp/server

# Устанавливаем все зависимости из requirements.txt
RUN pip install --no-cache-dir  -r requirements.txt

# Запуск приложения
CMD [ "python3", "-u", "/home/AI/comp/server/training_kube_http.py" ]

# Открытие порта
EXPOSE 15601

