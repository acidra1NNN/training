FROM alpine:3.21.2

# Установка необходимых пакетов
RUN apk update && apk add git gcc python3-dev linux-headers libffi-dev libc-dev musl-dev python3 py3-pip

# Настройка среды
ENV PYTHONUNBUFFERED=1
ENV TZ=Europe/Minsk

# Создаем рабочую директорию
RUN mkdir -p /home/AI/comp
WORKDIR /home/AI/comp

# Создание и активация виртуального окружения
RUN python3 -m venv /home/AI/venv
ENV PATH="/home/AI/venv/bin:$PATH"

# Обновляем pip
RUN pip install --upgrade pip 

# Копируем файлы training.py
COPY training_kube_http.py /home/AI/comp
COPY requirements.txt /home/AI/comp
COPY data /home/AI/comp/data
COPY logs /home/AI/comp/logs
COPY static /home/AI/comp/static    
COPY templates /home/AI/comp/templates

# Устанавливаем все зависимости из requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Запуск приложения
CMD [ "python3", "-u", "/home/AI/comp/training_kube_http.py" ]

# Открытие порта
EXPOSE 15601

