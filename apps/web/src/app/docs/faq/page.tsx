import { Disclosure } from "@/components/ui/disclosure";

export default function FaqPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">FAQ</h1>
      </header>

      <Disclosure question="Что мне нужно, чтобы начать?">
        Зарегистрироваться, пройти 5-шаговый onboarding (уровень / длительность
        / баланс / свежесть), добавить YouTube + Brave ключи в Settings. После
        этого создайте первый workspace и нажмите Run search.
      </Disclosure>

      <Disclosure question="Реклама на видео YouTube — есть?">
        Да, на монетизированных видео реклама остаётся — YouTube IFrame API не
        позволяет её отключить. Мы предпочитаем академические каналы в подборке,
        но не обещаем «полностью без рекламы». Логотип YouTube в плеере тоже
        остаётся (требование ToS).
      </Disclosure>

      <Disclosure question="Куда уходят мои данные?">
        Email, заметки, метаданные сохранённых ресурсов — в Postgres. Контент
        статей мы не сохраняем (copyright). API-ключи шифруются AES-256-GCM с
        master-ключом из <code>ENCRYPTION_KEY</code>; auth tag binding связывает
        каждую запись с её userId + provider, так что украденный ciphertext
        одной строки нельзя подсунуть в другую.
      </Disclosure>

      <Disclosure question="Почему «без рекомендаций»?">
        Потому что любая рекомендация — это удержание. PROJECT.pdf §5 принцип 1:
        «Никаких рекомендаций "вам может быть интересно". Никогда. Ни на каком
        экране». Это закон проекта.
      </Disclosure>

      <Disclosure question="Что делать, если reader-mode не открывает статью?">
        Mozilla Readability работает на ~80% сайтов. Для остальных мы показываем
        кнопку «Open original» — открывает оригинал в новой вкладке. Сайты,
        которые активно блокируют ботов, тоже попадут в эту категорию.
      </Disclosure>

      <Disclosure question="Как удалить аккаунт?">
        Settings → Danger zone → Delete account. Это удаляет пользователя и все
        привязанные workspaces / ресурсы / заметки / ключи навсегда (нет
        30-дневного окна восстановления для аккаунта целиком).
      </Disclosure>

      <Disclosure question="Есть мобильное приложение?">
        Пока нет. Веб-версия адаптивна. Мобильное приложение (Expo + React
        Native) запланировано после стабилизации MVP — не раньше 6-9 месяцев
        после релиза.
      </Disclosure>

      <Disclosure question="Можно использовать без API-ключей?">
        Нет. YouTube и Brave — обязательные источники подбора материалов. Без
        них продукт не работает. Anthropic — опциональный, нужен только для
        AI-резюме (будущая фича).
      </Disclosure>
    </article>
  );
}
