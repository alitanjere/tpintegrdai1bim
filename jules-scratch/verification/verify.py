from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to register page
    page.goto("http://localhost:5173/register")
    page.fill('input[name="first_name"]', "Test")
    page.fill('input[name="last_name"]', "User")
    timestamp = page.evaluate("() => Date.now()")
    unique_email = f"testuser{timestamp}@test.com"
    page.fill('input[name="username"]', unique_email)
    page.fill('input[name="password"]', "password")
    page.fill('input[name="confirmPassword"]', "password")
    page.click('button[type="submit"]')

    # Wait for the success toast and navigation to login
    expect(page.get_by_text("¡Cuenta creada exitosamente!")).to_be_visible()
    page.wait_for_url("**/login")

    # Go to login page
    page.fill('input[name="username"]', unique_email)
    page.fill('input[name="password"]', "password")
    page.click('button[type="submit"]')

    # Wait for login success and navigation to home
    expect(page.get_by_text("¡Bienvenido!")).to_be_visible()
    page.wait_for_url("**/")

    # Verify we are logged in by checking for the "Mis Eventos" link
    expect(page.get_by_role("link", name="Mis Eventos")).to_be_visible()

    # Create a new event location
    page.goto("http://localhost:5173/create-location")
    page.wait_for_selector('input[name="name"]')
    page.fill('input[name="name"]', "Test Location")
    page.fill('input[name="full_address"]', "123 Test Street")
    page.select_option('select[name="id_location"]', '1')
    page.fill('input[name="max_capacity"]', "100")
    page.click('button[type="submit"]:has-text("Crear Ubicación")')

    expect(page.get_by_text("¡Ubicación creada exitosamente!")).to_be_visible()
    page.wait_for_url("**/event-locations")

    # Create a new event
    page.goto("http://localhost:5173/create-event")
    page.wait_for_selector('input[name="name"]')
    page.fill('input[name="name"]', "Test Event")
    page.fill('textarea[name="description"]', "This is a test event.")
    page.select_option('select[name="id_event_location"]', '1')
    page.fill('input[name="start_date"]', "2025-12-31T23:59")
    page.fill('input[name="duration_in_minutes"]', "60")
    page.fill('input[name="price"]', "10")
    page.fill('input[name="max_assistance"]', "50")
    page.click('button[type="submit"]:has-text("Crear Evento")')

    # Wait for event creation and navigation
    expect(page.get_by_text("¡Evento creado exitosamente!")).to_be_visible()
    expect(page.get_by_text("Test Event")).to_be_visible() # Check that we are on the detail page

    # Go to my events page
    page.goto("http://localhost:5173/my-events")

    # Check that both created and enrolled events are there
    expect(page.get_by_text("Eventos Creados")).to_be_visible()
    expect(page.get_by_text("Test Event")).to_be_visible()

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
