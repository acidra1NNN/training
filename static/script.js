document.addEventListener("DOMContentLoaded", function () {
    const dateInput = document.getElementById("date");
    const timeSelect = document.getElementById("time");
    const bookButton = document.getElementById("book");
    const selectedDateInput = document.getElementById("selected-date");
    const showListButton = document.getElementById("show-list");
    const participantsList = document.getElementById("participants-list");
    const cancelButton = document.getElementById("cancel");

    // Получаем модальные окна
    const errorModal = document.getElementById("error-modal");
    const successModal = document.getElementById("success-modal");
    const closeModal = document.getElementById("close-modal");
    const closeSuccessModal = document.getElementById("close-success-modal");

    // Загружаем расписание с сервера
    function loadSchedule() {
        // Обработчик изменения даты
        dateInput.addEventListener("change", function () {
            const selectedDate = this.value;
            timeSelect.innerHTML = ""; // Очищаем список

            if (selectedDate) {
            
                // did fork test
                // Загружаем доступные времена для выбранной даты
                fetch(`https://training.nces.by:15601/schedule?date=${selectedDate}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Ошибка загрузки: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.times && data.times.length > 0) {
                            data.times.forEach(time => {
                                const option = document.createElement("option");
                                option.value = time;
                                option.textContent = time;
                                timeSelect.appendChild(option);
                            });
                        } else {
                            const option = document.createElement("option");
                            option.value = "";
                            option.textContent = "Нет доступных временных слотов";
                            timeSelect.appendChild(option);
                        }
                    })
                    .catch(error => {
                        console.error("Ошибка загрузки расписания:", error);
                        showErrorModal();
                    });
            }
        });
    }


    function extract_oids_from_cms(cms_signature) {
        console.log("Попытка извлечь данные из CMS:", cms_signature);
    
        try {
            // Здесь идет парсинг CMS. Например, если это строка base64
            const decodedCms = atob(cms_signature);
            console.log("Декодированные данные:", decodedCms);
            
            // Ваша логика извлечения данных из cms
            const oid_2_5_4_4 = decodedCms.match(/oid_2_5_4_4=(.*?);/)[1];
            const oid_2_5_4_41 = decodedCms.match(/oid_2_5_4_41=(.*?);/)[1];

            return [oid_2_5_4_4, oid_2_5_4_41];  // Возвращаем данные
        } catch (error) {
            console.error("Ошибка при извлечении данных из CMS:", error);
            throw new Error("Не удалось извлечь ФИО из CMS.");
        }
    }

    // Функция для отображения модального окна
	function showErrorModal(message = "Произошла ошибка") {
		const errorModal = document.getElementById("error-modal");
		const errorMessage = document.getElementById("error-message");

		if (errorModal && errorMessage) {
			errorMessage.textContent = message;
			errorModal.style.display = "block"; // Показываем модальное окно ошибки
		} else {
			alert(message); // Если модального окна нет, показываем alert
		}
	}


	function showSuccessModal(message) {
		const successModal = document.getElementById("success-modal");
		const successMessage = document.getElementById("success-message");

		console.log("showSuccessModal вызван с сообщением:", message);
		console.log("successModal:", successModal);
		console.log("successMessage:", successMessage);

		if (successModal && successMessage) {
			successMessage.textContent = message;
			successModal.style.display = "block";  // Показываем окно успеха
			console.log("Модальное окно успеха отображено.");
		} else {
			console.error("Ошибка: success-modal не найден!");
			alert(message);  // Если модального окна нет, показываем alert
		}
	}


    // Закрыть модальные окна при клике на крестик
    if (closeModal) {
        closeModal.addEventListener("click", function () {
            if (errorModal) {
                errorModal.style.display = "none"; // Скрыть окно ошибки
            }
        });
    }

    if (closeSuccessModal) {
        closeSuccessModal.addEventListener("click", function () {
            if (successModal) {
                successModal.style.display = "none"; // Скрыть окно успеха
            }
        });
    }

    // Запись на тренировку

		bookButton.addEventListener("click", function () {
		const selectedDate = dateInput.value;
		const selectedTime = timeSelect.value;
		const selectedType = document.getElementById("type").value;

		if (!selectedDate || !selectedTime) {
			alert("Выберите дату и время!");
			return;
		}

		// 1. Запрашиваем CMS с локального сервиса пользователя
		fetch("http://127.0.0.1:8084/sign", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ data: "ZmlsZQ==", isDetached: "false" })
		})
		.then(response => {
			if (!response.ok) {
				throw new Error("Локальный сервис подписания недоступен");
			}
			return response.json();
		})
		.then(data => {
			const cmsSignature = data.cms;

			// 2. Отправляем подписанные данные на сервер Flask
			return fetch("/book", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					date: selectedDate, 
					time: selectedTime, 
					type: selectedType, 
					cms: cmsSignature 
				})
			});
		})
		.then(response => {
			if (!response.ok) {
				return response.json().then(errorData => {
					alert(errorData.message);
					throw new Error(errorData.message);
				});
			}
			return response.json();
		})
		.then(data => {
			alert(data.message);
		})
		.catch(error => {
    console.error("Ошибка записи:", error);
    
    // Проверяем, является ли ошибка сетевой (`Failed to fetch`)
    if (error.message.includes("Failed to fetch")) {
        showErrorModal("                   Не запущено клиентское приложение КП");
    } else {
        showErrorModal(error.message || "Ошибка записи.");
    }
	});

});

    // Показать список записавшихся

showListButton.addEventListener("click", function () {
    const selectedDate = selectedDateInput.value;
    if (!selectedDate) {
        alert("Выберите дату!");
        return;
    }

    fetch(`/list?date=${selectedDate}`)
    .then(response => {
        if (!response.ok) {
            throw new Error("Ошибка загрузки списка");
        }
        return response.json();
    })
    .then(data => {
        console.log("Полученные данные:", data);  // Логируем для отладки

        participantsList.innerHTML = ""; // Очищаем список перед добавлением

        // Проверяем, есть ли сообщение об отсутствии записей
        if (data.message && data.message.includes("Записей нет")) {
            participantsList.innerHTML = "<p>На эту дату пока никто не записался</p>";
            return;
        }

        // Если список сессий пустой, выводим другое сообщение
        if (!data.sessions || Object.keys(data.sessions).length === 0) {
            participantsList.innerHTML = "<p>На эту дату пока никто не записался</p>";
            return;
        }

        // Создаем контейнер для вывода в три колонки
        const gridContainer = document.createElement("div");
        gridContainer.style.display = "grid";
        gridContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
        gridContainer.style.gap = "10px";
        gridContainer.style.alignItems = "start";  // Выравнивание по верхнему краю

        // Перебираем все временные интервалы и выводим участников
        Object.entries(data.sessions).forEach(([time, session], index) => {
            const timeBlock = document.createElement("div");
            timeBlock.style.display = "flex";
            timeBlock.style.flexDirection = "column";
            timeBlock.style.justifyContent = "flex-start"; // Выравнивание по верхнему краю

            // Заголовок для времени
            const timeHeader = document.createElement("h3");
            timeHeader.textContent = `Время: ${time}`;
            timeHeader.style.marginBottom = "10px"; // Отступ снизу
            timeBlock.appendChild(timeHeader);

            // Получаем тип тренировки для текущего времени
            const trainingType = session.type || "Не указан";

            // Список участников
            if (session.participants && session.participants.length > 0) {
                const participantList = document.createElement("ul");
                participantList.style.listStyleType = "none"; // Убираем маркеры списка
                participantList.style.paddingLeft = "0"; // Убираем отступ слева

                session.participants.forEach(participant => {
                    const listItem = document.createElement("li");

                    // Отображаем ФИО и тип тренировки
                    listItem.textContent = `${participant["ФИО"]} - ${trainingType}`;

                    participantList.appendChild(listItem);
                });

                timeBlock.appendChild(participantList);
            } else {
                const noParticipants = document.createElement("p");
                noParticipants.textContent = "На это время никто не записался.";
                timeBlock.appendChild(noParticipants);
            }

            // Добавляем блок времени в контейнер с сеткой
            gridContainer.appendChild(timeBlock);
        });

        participantsList.appendChild(gridContainer); // Добавляем сетку в основной контейнер
    })
    .catch(error => {
        console.error("Ошибка загрузки списка:", error);
        showErrorModal();
    });
});


    // Отмена записи
		cancelButton.addEventListener("click", function () {
    const selectedDate = dateInput.value;
    const selectedTime = timeSelect.value;

    if (!selectedDate || !selectedTime) {
        alert("Выберите дату и время для отмены.");
        return;
    }

    console.log("Отправляем запрос на локальный сервис подписания...");

    fetch("http://127.0.0.1:8084/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "ZmlsZQ==", isDetached: "false" })
    })
    .then(response => {
        console.log("Ответ от локального сервиса подписания:", response);
        if (!response.ok) {
            throw new Error("Локальный сервис подписания недоступен");
        }
        return response.json();
    })
    .then(data => {
        const cmsSignature = data.cms;
        console.log("Полученная CMS-подпись:", cmsSignature);

        console.log("Отправляем запрос на отмену записи в Flask...");
        return fetch("/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                date: selectedDate, 
                time: selectedTime, 
                cms: cmsSignature 
            })
        });
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(result => {
        console.log("Ответ сервера при отмене:", result); // Проверяем ответ

        if (result.status === 200) {
            console.log("Отмена прошла успешно. Показываем модальное окно успеха.");
            showSuccessModal(result.body.message);  //  Проверяем, вызывается ли функция
        } else {
            console.log("Ошибка отмены. Показываем модальное окно ошибки.");
            showErrorModal(result.body.message);
        }
    })
    .catch(error => {
        console.error("Ошибка отмены записи:", error);
        showErrorModal("                   Не запущено клиентское приложение КП");
    });
});


    // Инициализация загрузки расписания
    loadSchedule();
});
