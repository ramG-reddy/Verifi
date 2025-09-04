import os, pandas as pd, joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_PATH = os.environ.get("TRAIN_DATA", os.path.join(os.path.dirname(__file__), "financial_advice_dataset.csv"))
MODEL_PATH = os.environ.get("ML_MODEL_PATH", os.path.join(os.path.dirname(__file__), "model.joblib"))

def load_and_prepare_data():
    """Load the consolidated training dataset"""
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")
    
    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    print(f"Class balance: {df['label'].value_counts(normalize=True)}")
    
    return df

def create_feature_pipeline():
    """Create optimized feature extraction pipeline"""
    return TfidfVectorizer(
        ngram_range=(1, 3),          # Unigrams, bigrams, and trigrams
        stop_words='english',         # Remove common English stop words
        min_df=2,                    # Ignore terms that appear in less than 2 documents
        max_df=0.95,                 # Ignore terms that appear in more than 95% of documents
        max_features=15000,          # Limit vocabulary size
        lowercase=True,              # Convert to lowercase
        strip_accents='unicode',     # Remove accents
        token_pattern=r'\b[a-zA-Z]{2,}\b',  # Only alphabetic tokens with 2+ chars
        sublinear_tf=True            # Apply sublinear tf scaling
    )

def evaluate_models(X_train, X_test, y_train, y_test, tfidf):
    """Evaluate multiple models and return the best one"""
    
    models = {
        'Random Forest': RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1
        ),
        'Gradient Boosting': GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=10,
            random_state=42,
            subsample=0.8
        ),
        'Logistic Regression': LogisticRegression(
            C=1.0,
            random_state=42,
            class_weight='balanced',
            max_iter=1000,
            solver='liblinear'
        ),
        'SVM': SVC(
            C=1.0,
            kernel='linear',
            random_state=42,
            class_weight='balanced',
            probability=True
        )
    }
    
    best_model = None
    best_score = 0
    best_name = ""
    results = {}
    
    print("Evaluating models:")
    print("-" * 50)
    
    for name, model in models.items():
        # Create pipeline
        pipe = Pipeline([
            ('tfidf', tfidf),
            ('classifier', model)
        ])
        
        # Train model
        pipe.fit(X_train, y_train)
        
        # Evaluate
        train_score = pipe.score(X_train, y_train)
        test_score = pipe.score(X_test, y_test)
        
        # Cross-validation
        cv_scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring='f1')
        
        # ROC-AUC
        y_prob = pipe.predict_proba(X_test)[:, 1]
        roc_auc = roc_auc_score(y_test, y_prob)
        
        results[name] = {
            'train_acc': train_score,
            'test_acc': test_score,
            'cv_f1_mean': cv_scores.mean(),
            'cv_f1_std': cv_scores.std(),
            'roc_auc': roc_auc,
            'model': pipe
        }
        
        print(f"{name}:")
        print(f"  Train Accuracy: {train_score:.4f}")
        print(f"  Test Accuracy: {test_score:.4f}")
        print(f"  CV F1 Score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        print(f"  ROC-AUC: {roc_auc:.4f}")
        print()
        
        # Select best model based on CV F1 score
        if cv_scores.mean() > best_score:
            best_score = cv_scores.mean()
            best_model = pipe
            best_name = name
    
    print(f"Best model: {best_name} (CV F1: {best_score:.4f})")
    return best_model, best_name, results

def hyperparameter_tuning(X_train, y_train):
    """Perform hyperparameter tuning for Random Forest"""
    print("Performing hyperparameter tuning...")
    
    param_grid = {
        'classifier__n_estimators': [100, 200, 300],
        'classifier__max_depth': [10, 15, 20],
        'classifier__min_samples_split': [2, 5, 10],
        'classifier__min_samples_leaf': [1, 2, 4]
    }
    
    pipe = Pipeline([
        ('tfidf', create_feature_pipeline()),
        ('classifier', RandomForestClassifier(random_state=42, class_weight='balanced', n_jobs=-1))
    ])
    
    grid_search = GridSearchCV(
        pipe, 
        param_grid, 
        cv=3, 
        scoring='f1',
        n_jobs=-1,
        verbose=1
    )
    
    grid_search.fit(X_train, y_train)
    
    print(f"Best parameters: {grid_search.best_params_}")
    print(f"Best CV score: {grid_search.best_score_:.4f}")
    
    return grid_search.best_estimator_

def analyze_features(model, feature_names, top_n=20):
    """Analyze top features for fraud detection"""
    if hasattr(model.named_steps['classifier'], 'feature_importances_'):
        importances = model.named_steps['classifier'].feature_importances_
        indices = np.argsort(importances)[::-1]
        
        print(f"\nTop {top_n} most important features:")
        print("-" * 50)
        for i in range(min(top_n, len(indices))):
            idx = indices[i]
            print(f"{i+1:2d}. {feature_names[idx]:30s} {importances[idx]:.4f}")

def test_sample_predictions(model):
    """Test model with sample predictions"""
    test_samples = [
        "SEBI registered investment advisor. Mutual funds subject to market risks",
        "Guaranteed 25% returns in 2 weeks! Join our Telegram group",
        "ICICI Securities - diversified equity investments for long-term goals",
        "Pre-IPO shares available! Send money to paytm@insider immediately",
        "Systematic investment in mutual funds helps achieve financial goals",
        "URGENT: 300% returns in 3 days confirmed. Send money now!",
        "Angel One Limited - SEBI registered broker providing research reports",
        "Risk-free trading! Our AI guarantees 50% daily returns",
        "Past performance is not indicative of future returns",
        "BREAKING: Secret billionaire strategy revealed! 500% returns guaranteed!"
    ]
    
    print("\nSample Predictions:")
    print("-" * 70)
    
    for text in test_samples:
        prob = model.predict_proba([text])[0]
        prediction = "FRAUDULENT" if prob[1] > 0.5 else "LEGITIMATE"
        confidence = max(prob) * 100
        
        print(f"Text: {text[:50]}...")
        print(f"Prediction: {prediction} (Confidence: {confidence:.1f}%)")
        print(f"Fraud probability: {prob[1]:.3f}")
        print("-" * 70)

def main():
    print("Financial Advice Fraud Detection Model Training")
    print("=" * 60)
    
    # Load data
    df = load_and_prepare_data()
    
    # Prepare features and labels
    X = df['text'].fillna("").astype(str)
    y = df['label'].astype(int)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTraining set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # Create feature pipeline
    tfidf = create_feature_pipeline()
    
    # Evaluate multiple models
    best_model, best_name, results = evaluate_models(X_train, X_test, y_train, y_test, tfidf)
    
    # Optional: Hyperparameter tuning for Random Forest
    if best_name == 'Random Forest':
        print("\nPerforming hyperparameter tuning for Random Forest...")
        tuned_model = hyperparameter_tuning(X_train, y_train)
        
        # Compare tuned model
        tuned_score = tuned_model.score(X_test, y_test)
        original_score = best_model.score(X_test, y_test)
        
        if tuned_score > original_score:
            print(f"Tuned model performs better: {tuned_score:.4f} vs {original_score:.4f}")
            best_model = tuned_model
        else:
            print(f"Original model performs better: {original_score:.4f} vs {tuned_score:.4f}")
    
    # Final evaluation
    y_pred = best_model.predict(X_test)
    y_prob = best_model.predict_proba(X_test)[:, 1]
    
    print(f"\nFinal Model Performance ({best_name}):")
    print("=" * 40)
    print(f"Test Accuracy: {best_model.score(X_test, y_test):.4f}")
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraudulent']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"True Negatives: {cm[0,0]}, False Positives: {cm[0,1]}")
    print(f"False Negatives: {cm[1,0]}, True Positives: {cm[1,1]}")
    
    # Feature analysis
    feature_names = best_model.named_steps['tfidf'].get_feature_names_out()
    analyze_features(best_model, feature_names)
    
    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(best_model, MODEL_PATH)
    print(f"\nModel saved to: {MODEL_PATH}")
    
    # Test sample predictions
    test_sample_predictions(best_model)
    
    print(f"\nTraining completed successfully!")
    print(f"Model type: {best_name}")
    print(f"Features: {len(feature_names)}")
    print(f"Training samples: {len(X_train)}")

if __name__ == "__main__":
    main()
