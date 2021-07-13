using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ColorChanger : MonoBehaviour
{
    private Renderer renderer;

    private void Awake()
    {
        this.renderer = this.GetComponent<Renderer>();
        this.renderer.material.color = Color.red;
    }

    private void OnMouseUp()
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
