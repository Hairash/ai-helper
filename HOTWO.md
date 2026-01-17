# Install

### Server
1. Create virtual environemnt
    ```
    cd server
    python -m venv venv
    ```

1. Install requirements
    ```
    pip install -r requirements.txt
    ```

### Broswer extension
1. Open "extensions" tab in Google Chrome
1. Turn on "developer mode"
1. Click "Load unpacked"
1. Select the "browser_extension" folder

# Run server
1. Export variables  
`export MISTRAL_API_KEY=<GREAT_API_KEY>`

1. Run server locally
    ```
    export MISTRAL_API_KEY=$(grep "^MISTRAL_API_KEY=" .env | cut -d '=' -f2-)
    cd server
    source venv/bin/activate
    uvicorn server:app --reload --port 8000
    ```
