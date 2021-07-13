using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ColorChanger : MonoBehaviour
{
    private Renderer renderer;

    private void Awake()
    {
        this.renderer = this.GetComponent<Renderer>();
        this.renderer.material.color = Color.blue;
    }


    private void Update()
    {
        int fingerCount = 0;

        foreach (Touch touch in Input.touches)
        {
            if (touch.phase != TouchPhase.Ended && touch.phase != TouchPhase.Canceled)
            {
                fingerCount++;
            }
        }

        if (fingerCount > 0)
        {
            if (this.renderer.material.color == Color.red)
            {

                this.renderer.material.color = Color.blue;
            }
            else
            {
                this.renderer.material.color = Color.red;
            }
        }
    }
}
