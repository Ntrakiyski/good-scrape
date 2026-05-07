---
title: "OLX Портал за програмисти"
url: "https://developer.olx.bg/bg/articles/faq"
---

### Чести въпроси

### 1\. "Invalid owner in token"

The problem occurs when you are authorized with **"grant\_type": "client\_credentials"** and you are trying to perform actions in the OLX user context, for example: adding the ad or checking out account balance. In this situation you have to authorize yourself with **"grant\_type": "autorization\_code"**.

### 2\. Content-Type: application/json

If you use a GET request, do not use the **"Content-Type": "application/json"** header - it is dedicated to PUT, POST request. Otherwise, you will stumble upon 400 Bad Request Error.

### 3\. "Missing required header"

This error means that there is no version header in your request. It is necessary in some requests. For example: if you are using API v2, there should be **"Version": "2.0"** header in your request.

### 4\. Защо refresh\_token е изтекъл?

Токенът за опресняване е валиден един месец (2592000 секунди) и изтича след този период - няма възможност за генериране на вечен refresh token. Той може да бъде променен, когато се генерира нов токен за достъп. Може да се наложи да актуализирате токенa за достъп и да go опресните в базата си данни. Моля, пазете ги.

### 5\. Как да настроите callback URL?

- Отидете в "Вашите приложения" и изберете "Редактиране на приложение":  
	  
	![Edit application](https://developer.olx.bg/img/articles/faq/1.jpg?v49)
- Попълнете полето "Redirect uri" и запазете промените:  
	  
	![Redirect URI form](https://developer.olx.bg/img/articles/faq/2.jpg?v49)
- Можете да дадете повече от един URL, ако е необходимо. За да го направите, моля разделете ги чрез разтояние.

### 6\. Мога ли да използвам API да чета обяви на други потребители?

Не е възможно - можете да менажирате само собствените си обяви, добавени в оторизирания OLX акаунт.

### 7\. "The grant type is unauthorized for this client\_id"

Проблемът е свързан с "grant\_type", който използвате в заявката, ако на профила ви в API не е разрешено да използва определен тип грант. Първо проверете дали типът грант е валиден. Ако всичко изглежда наред, но постоянно се натъквате на тази грешка - свържете се с нас.

### 8\. Как мога да управлявам обявите си в различни страни?

Можете да управлявате своите обяви в следните държави:

| OLX PL | https://www.olx.pl/ |
| --- | --- |
| OLX BG | https://www.olx.bg/ |
| OLX RO | https://www.olx.ro/ |
| OLX PT | https://www.olx.pt/ |
| OLX UA | https://www.olx.ua/ |
| OLX KZ | https://www.olx.kz/ |

Note that *client\_id* and *client\_secret* allow you to manage your ads only for one country. If you would like to manage your ads in another country, you have to authorize OLX account created in a given country where you want to manage the ads. Then you will get new credentials.

### 9\. Как мога да тествам API? Предоставяте ли тест среда?

За съжаление, не можем да предоставим тест среда в API. Можете да използвате различен или да създадете нов акаунт с цел да тествате API заявките.

### 10\. В кои категории мога да публикувам обяви?

Някои категории могат да бъдат изключени от добавянето на реклами в зависимост от страната (например: категории за недвижими имоти или безплатни категории в Полша). Ако не сте сигурни дали ще можете да публикувате обяви в дадена категория, моля, свържете се с нас.

### 11\. Има ли максимален брой повиквания, които OLX API приема за определен период от време?

Системата OLX API позволява максимум 4500 заявки, които могат да бъдат изпратени от IP адреса на даден потребител в рамките на 5 минути. Този лимит е определен от съображения за сигурност, за да се гарантира стабилността на платформата. В случай че този лимит бъде надхвърлен, автоматично ще бъде генерирана следната грешка:

  
![Rate limits](https://developer.olx.bg/img/articles/faq/3.jpg?v49)  
  

Така, ако IP адресът, използван за изпращане на API повиквания, е локален, максималният брой изпратени API заявки може да бъде 4500 заявки/5 минути. Всяко превишаване на този лимит се блокира автоматично, но блокирането продължава 30 минути. Препоръчваме ви да поддържате броя на повикванията под тези стойности, за да сте сигурни, че няма ограничения, които биха могли да повлияят на процеса на публикуване на рекламите ви.

Ако ситуацията продължава, моля, предоставете ни IP адреса, от който изпращате API повиквания, за да проверим и да се уверим, че той не присъства в централен черен списък, както и идентификатора на заявката, която е била отхвърлена с грешка 403.

---

### Page Assets

- [https://developer.olx.bg/img/logo.svg?v49](https://developer.olx.bg/img/logo.svg?v49)
- [https://developer.olx.bg/img/menu.svg?v49](https://developer.olx.bg/img/menu.svg?v49)
- [https://developer.olx.bg/img/close.svg?v49](https://developer.olx.bg/img/close.svg?v49)
- [https://developer.olx.bg/img/chevron-right.svg?v49](https://developer.olx.bg/img/chevron-right.svg?v49)
- [Edit application](https://developer.olx.bg/img/articles/faq/1.jpg?v49)
- [Redirect URI form](https://developer.olx.bg/img/articles/faq/2.jpg?v49)
- [Rate limits](https://developer.olx.bg/img/articles/faq/3.jpg?v49)
- [logo_olx](https://developer.olx.bg/img/footer_logo.svg?v49)
