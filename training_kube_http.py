from flask import Flask, render_template, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import requests
from cryptography import x509
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.hazmat.backends import default_backend
from asn1crypto import cms
import base64

app = Flask(__name__, static_url_path="/static")
CORS(app)

#ALLOWED_REFERER = "https://training.nces.by"
DATA_PATH = "data/"
LOGS_PATH = "logs/"
USERS_FILE = os.path.join(DATA_PATH, "users.csv")
SCHEDULE_FILE = os.path.join(DATA_PATH, "schedule.json")
HISTORY_FILE = os.path.join(DATA_PATH, "history.json")
LOGS_PATH = "logs"

os.makedirs(LOGS_PATH, exist_ok=True)

DEFAULT_TIMES = ["13:00", "18:10", "19:00"]


def generate_schedule():
    schedule = {}
    start_date = datetime.today()

    # Генерируем расписание на следующие 5 дней
    for i in range(365):
        current_date = start_date + timedelta(days=i)
        formatted_date = current_date.strftime('%Y-%m-%d')

        # Добавляем расписание для этой даты
        schedule[formatted_date] = DEFAULT_TIMES

    # Сохраняем расписание в файл
    with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
        json.dump(schedule, f, indent=4, ensure_ascii=False)

    print("Расписание успешно сгенерировано и сохранено!")


# Вызываем функцию для генерации расписания

def load_json(filename):
    try:
        with open(filename, "r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

def extract_oids(certificate):
    """
    Извлекает все OID из X.509 сертификата.
    """
    try:
        cert = x509.load_der_x509_certificate(certificate.dump(), default_backend())
        subject = cert.subject
        oids = []

        for attr in subject:
            oids.append((attr.oid.dotted_string, attr.value))

        return oids
    except Exception as e:
        print(f" Ошибка извлечения OID из сертификата: {e}")
        return []
def extract_oids_from_cms(cms_base64):
    """
    Разбирает CMS-подпись и извлекает фамилию (OID 2.5.4.4) и имя (OID 2.5.4.41).
    """
    try:
        cms_bytes = base64.b64decode(cms_base64)
        content_info = cms.ContentInfo.load(cms_bytes)

        if 'content' not in content_info:
            raise ValueError("SignedData отсутствует в CMS.")

        signed_data = content_info['content']

        if 'certificates' not in signed_data:
            raise ValueError("Сертификаты отсутствуют в CMS.")

        for cert_choice in signed_data['certificates']:
            if cert_choice.name == 'certificate':
                certificate = cert_choice.chosen

                # Извлекаем OID
                oids = extract_oids(certificate)

                # Ищем конкретные OID
                oid_2_5_4_4 = next((value for oid, value in oids if oid == "2.5.4.4"), "Неизвестный")
                oid_2_5_4_41 = next((value for oid, value in oids if oid == "2.5.4.41"), "Пользователь")

                return oid_2_5_4_4, oid_2_5_4_41

    except Exception as e:
        print(f" Ошибка разбора подписи: {e}")

    return "Неизвестный", "Пользователь"

generate_schedule()
 
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def get_static(filename):
    referer = request.headers.get("Referer", "")

    # Запрещаем доступ, если Referer отсутствует или не совпадает
    if not referer or not referer.startswith(ALLOWED_REFERER):
        print(f"403 Forbidden: Referer={referer}")  # Логируем
        abort(403)  # Доступ запрещен

    return send_from_directory("static", filename)

# @app.route("/api/static/<path:filename>")
# def get_static(filename):
#      return send_from_directory("static", filename)

@app.route("/schedule")
def get_schedule():
    date = request.args.get("date")
    if not date:
        return jsonify({"times": [], "sessions": []})

    schedule = load_json(SCHEDULE_FILE)
    history = load_json(HISTORY_FILE)

    times = schedule.get(date, [])
    sessions = history.get(date, [])

    return jsonify({"times": times, "sessions": sessions})


@app.route("/list")
def list_bookings():
    date = request.args.get("date")
    if not date:
        return jsonify({"message": "Дата не указана"}), 400

    log_file = os.path.join(LOGS_PATH, f"{date}.json")

    if not os.path.exists(log_file):
        return jsonify({"message": "Записей нет", "sessions": []}), 200

    # Загружаем содержимое JSON-файла
    log_data = load_json(log_file)

    # Если в файле нет записей на запрашиваемую дату
    if date not in log_data or not log_data[date]:
        return jsonify({"message": "На эту дату пока никто не записался", "sessions": []}), 200

    return jsonify({"message": "Записи найдены", "sessions": log_data[date]})



@app.route("/book", methods=["POST"])
def book():
    data = request.json
    if "date" not in data or "time" not in data or "type" not in data or "cms" not in data:
        return jsonify({"message": "Отсутствуют обязательные параметры"}), 400

    cms_signature = data["cms"]  # Подпись теперь приходит от клиента

    # 1. Извлекаем ФИО из подписи
    oid_2_5_4_4, oid_2_5_4_41 = extract_oids_from_cms(cms_signature)
    full_name = f"{oid_2_5_4_4} {oid_2_5_4_41}"

    # 2. Проверяем, не записан ли уже участник
    log_file = os.path.join(LOGS_PATH, f"{data['date']}.json")
    log_data = load_json(log_file)

    if data["date"] not in log_data:
        log_data[data["date"]] = {}

    if data["time"] not in log_data[data["date"]]:
        log_data[data["date"]][data["time"]] = {
            "type": data["type"],
            "participants": []
        }

    existing_participant = any(
        participant["ФИО"] == full_name
        for participant in log_data[data["date"]][data["time"]]["participants"]
    )

    if existing_participant:
        return jsonify({"message": "Вы уже записаны на это время!"}), 400

    # 3. Записываем участника
    participant_data = {"ФИО": full_name}
    log_data[data["date"]][data["time"]]["participants"].append(participant_data)
    save_json(log_file, log_data)

    return jsonify({"message": "Вы успешно записались!"})



@app.route("/cancel", methods=["POST"])
def cancel_booking():
    data = request.json
    if "date" not in data or "time" not in data or "cms" not in data:
        return jsonify({"message": "Отсутствуют обязательные параметры"}), 400

    log_file = os.path.join(LOGS_PATH, f"{data['date']}.json")
    cms_signature = data["cms"]

    try:
        oid_2_5_4_4, oid_2_5_4_41 = extract_oids_from_cms(cms_signature)
        full_name_from_signature = f"{oid_2_5_4_4} {oid_2_5_4_41}"
    except Exception as e:
        print(f"Ошибка извлечения ФИО из подписи: {e}")
        return jsonify({"message": "Не удалось извлечь ФИО из подписи"}), 400

    if not os.path.exists(log_file):
        return jsonify({"message": "Вы не записаны на тренировку на эту дату."}), 400

    log_data = load_json(log_file)

    if data["date"] not in log_data or data["time"] not in log_data[data["date"]]:
        return jsonify({"message": "Вы не записаны на тренировку на это время."}), 400

    participants = log_data[data["date"]][data["time"]]["participants"]

    participant_to_remove = next((p for p in participants if p["ФИО"] == full_name_from_signature), None)

    if participant_to_remove is None:
        return jsonify({"message": "Вы не записаны на тренировку на это время."}), 400

    participants.remove(participant_to_remove)
    save_json(log_file, log_data)

    return jsonify({"message": "Вы успешно отменили запись!"})  # Теперь сообщение точно вернётся


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=15601)
