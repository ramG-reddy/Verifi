import os, pandas as pd, joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_PATH = os.environ.get("TRAIN_DATA", os.path.join(os.path.dirname(__file__), "financial_advice_dataset.csv"))
MODEL_PATH = os.environ.get("ML_MODEL_PATH", os.path.join(os.path.dirname(__file__), "model.joblib"))

def load_and_prepare_data():
    """Load the consolidated training dataset with new fields"""
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")
    
    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    
    # Handle missing values for new fields
    df['returns_percentage'] = df['returns_percentage'].fillna(0)
    df['timeframe'] = df['timeframe'].fillna('unknown')
    
    print(f"Dataset shape: {df.shape}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    print(f"Class balance: {df['label'].value_counts(normalize=True)}")
    print(f"Returns percentage range: {df['returns_percentage'].min()} - {df['returns_percentage'].max()}")
    print(f"Timeframe categories: {df['timeframe'].value_counts()}")
    
    return df

def create_feature_pipeline():
    """Create comprehensive feature extraction pipeline including new fields"""
    text_pipeline = TfidfVectorizer(
        ngram_range=(1, 3),
        stop_words='english',
        min_df=2,
        max_df=0.95,
        max_features=15000,
        lowercase=True,
        strip_accents='unicode',
        token_pattern=r'\b[a-zA-Z]{2,}\b',
        sublinear_tf=True
    )
    
    # Create preprocessor for combining text and numerical/categorical features
    preprocessor = ColumnTransformer(
        transformers=[
            ('text', text_pipeline, 'text'),
            ('returns', StandardScaler(), ['returns_percentage']),
            ('timeframe', OneHotEncoder(handle_unknown='ignore'), ['timeframe'])
        ],
        remainder='drop'
    )
    
    return preprocessor

def evaluate_models(X_train, X_test, y_train, y_test, preprocessor):
    """Evaluate multiple models with enhanced feature set"""
    
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
        # Create pipeline with new preprocessor
        pipe = Pipeline([
            ('preprocessor', preprocessor),
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
    """Perform hyperparameter tuning for Random Forest with new features"""
    print("Performing hyperparameter tuning...")
    
    param_grid = {
        'classifier__n_estimators': [100, 200, 300],
        'classifier__max_depth': [10, 15, 20],
        'classifier__min_samples_split': [2, 5, 10],
        'classifier__min_samples_leaf': [1, 2, 4]
    }
    
    pipe = Pipeline([
        ('preprocessor', create_feature_pipeline()),
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

def analyze_features(model, top_n=20):
    """Analyze top features for fraud detection including new fields"""
    if hasattr(model.named_steps['classifier'], 'feature_importances_'):
        importances = model.named_steps['classifier'].feature_importances_
        
        # Get feature names from preprocessor
        try:
            feature_names = (
                model.named_steps['preprocessor']
                .named_transformers_['text']
                .get_feature_names_out().tolist() +
                ['returns_percentage'] +
                model.named_steps['preprocessor']
                .named_transformers_['timeframe']
                .get_feature_names_out().tolist()
            )
        except:
            print("Could not extract feature names for analysis")
            return
        
        indices = np.argsort(importances)[::-1]
        
        print(f"\nTop {top_n} most important features:")
        print("-" * 70)
        for i in range(min(top_n, len(indices))):
            idx = indices[i]
            feature_name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
            print(f"{i+1:2d}. {feature_name:40s} {importances[idx]:.4f}")

def test_sample_predictions(model):
    """Test model with sample predictions including new fields"""
    test_samples = pd.DataFrame([
        {"text": "SEBI registered investment advisor. Mutual funds subject to market risks", "returns_percentage": 0, "timeframe": "unknown"},
        {"text": "Guaranteed 25% returns in 2 weeks! Join our Telegram group", "returns_percentage": 25, "timeframe": "2 weeks"},
        {"text": "ICICI Securities - diversified equity investments for long-term goals", "returns_percentage": 12, "timeframe": "annual"},
        {"text": "Pre-IPO shares available! Send money to paytm@insider immediately", "returns_percentage": 300, "timeframe": "1 month"},
        {"text": "Systematic investment in mutual funds helps achieve financial goals", "returns_percentage": 10, "timeframe": "annual"},
        {"text": "URGENT: 300% returns in 3 days confirmed. Send money now!", "returns_percentage": 300, "timeframe": "3 days"},
        {"text": "Angel One Limited - SEBI registered broker providing research reports", "returns_percentage": 0, "timeframe": "unknown"},
        {"text": "Risk-free trading! Our AI guarantees 50% daily returns", "returns_percentage": 50, "timeframe": "daily"},
        {"text": "Past performance is not indicative of future returns", "returns_percentage": 0, "timeframe": "unknown"},
        {"text": "BREAKING: Secret billionaire strategy revealed! 500% returns guaranteed!", "returns_percentage": 500, "timeframe": "monthly"}
    ])
    
    print("\nSample Predictions:")
    print("-" * 100)
    
    for _, row in test_samples.iterrows():
        prob = model.predict_proba(row.to_frame().T)[0]
        prediction = "FRAUDULENT" if prob[1] > 0.5 else "LEGITIMATE"
        confidence = max(prob) * 100
        
        print(f"Text: {row['text'][:50]}...")
        print(f"Returns: {row['returns_percentage']}%, Timeframe: {row['timeframe']}")
        print(f"Prediction: {prediction} (Confidence: {confidence:.1f}%)")
        print(f"Fraud probability: {prob[1]:.3f}")
        print("-" * 100)

def main():
    print("Financial Advice Fraud Detection Model Training")
    print("=" * 60)
    df = load_and_prepare_data()
    
    X = df[['text', 'returns_percentage', 'timeframe']].copy()
    X['text'] = X['text'].fillna("").astype(str)
    y = df['label'].astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTraining set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    preprocessor = create_feature_pipeline()
    best_model, best_name, results = evaluate_models(X_train, X_test, y_train, y_test, preprocessor)
    
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
    
    analyze_features(best_model) # Feature analysis with new method
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(best_model, MODEL_PATH)
    print(f"\nModel saved to: {MODEL_PATH}")
    
    test_sample_predictions(best_model) # Testing sample predictions with new format
    
    print(f"\nTraining completed successfully!")
    print(f"Model type: {best_name}")
    print(f"Features: {len(feature_names)}")
    print(f"Training samples: {len(X_train)}")

if __name__ == "__main__":
    main()
