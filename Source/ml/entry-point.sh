# check if the model.joblib file exists
ml_path="$(pwd)/model.joblib"

# echo $ml_path

if [ ! -f "$ml_path" ]; then
  echo "Model file not found! Executing training script."
  exec python3.10 train.py
fi


uvicorn app:app --host 0.0.0.0 --port 8001