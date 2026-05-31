const fallbackImage =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80";

const listings = [
  {
    title: "Нежный микс роз и эустомы",
    price: 1800,
    city: "Москва",
    area: "Патриаршие",
    description: "Подарили утром, букет свежий. Отдам сегодня после 18:00.",
    image:
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Букет тюльпанов",
    price: 950,
    city: "Санкт-Петербург",
    area: "Петроградская",
    description: "Стояли в воде пару часов, упаковка целая.",
    image:
      "https://images.unsplash.com/photo-1589123053646-4e8c1e81e7da?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "Пионы в крафте",
    price: 2200,
    city: "Казань",
    area: "Центр",
    description: "Большой букет, самовывоз сегодня.",
    image:
      "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1000&q=80",
  },
];

const grid = document.querySelector("#listingGrid");
const cityFilter = document.querySelector("#cityFilter");
const priceFilter = document.querySelector("#priceFilter");
const resetFilters = document.querySelector("#resetFilters");
const listingForm = document.querySelector("#listingForm");

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function renderListings() {
  const selectedCity = cityFilter.value;
  const maxPrice = Number(priceFilter.value);

  const filtered = listings.filter((listing) => {
    const matchesCity = selectedCity === "all" || listing.city === selectedCity;
    const matchesPrice = !maxPrice || listing.price <= maxPrice;
    return matchesCity && matchesPrice;
  });

  grid.innerHTML = filtered
    .map(
      (listing) => `
        <article class="listing-card">
          <img src="${listing.image || fallbackImage}" alt="${listing.title}" />
          <div class="listing-card-content">
            <span>${listing.city}, ${listing.area}</span>
            <h3>${listing.title}</h3>
            <strong class="price">${formatPrice(listing.price)}</strong>
            <p>${listing.description || "Свежий букет, детали можно уточнить у продавца."}</p>
          </div>
        </article>
      `,
    )
    .join("");

  if (!filtered.length) {
    grid.innerHTML = '<p class="empty">Пока нет букетов под такие фильтры.</p>';
  }
}

cityFilter.addEventListener("change", renderListings);
priceFilter.addEventListener("input", renderListings);
resetFilters.addEventListener("click", () => {
  cityFilter.value = "all";
  priceFilter.value = "";
  renderListings();
});

listingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(listingForm);

  listings.unshift({
    title: formData.get("title").trim(),
    price: Number(formData.get("price")),
    city: formData.get("city").trim(),
    area: formData.get("area").trim(),
    description: formData.get("description").trim(),
    image: formData.get("image").trim() || fallbackImage,
  });

  listingForm.reset();
  renderListings();
  document.querySelector("#listings").scrollIntoView({ behavior: "smooth" });
});

renderListings();
